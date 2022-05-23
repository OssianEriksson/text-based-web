import express from "express"
import http from "http"
import sqlite3 from "sqlite3"
import { Server } from "socket.io"
import { dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const db = new sqlite3.Database("./database.sqlite")
db.run("CREATE TABLE IF NOT EXISTS text_based (id INTEGER PRIMARY KEY, stdout TEXT)")

const publisher = express()
const server = http.createServer(publisher)
const io = new Server(server)

publisher.get("/", (req, res) => {
  res.sendFile(`${__dirname}/index.html`)
})

publisher.get("/get", (req, res) => {
  db.get("SELECT stdout FROM text_based WHERE id = 0", (err, row) => {
    res.send({ stdout: row?.stdout || "" })
  })
})

server.listen(3001, () => console.log("Publisher ready on port 3001"))

const listener = express()
listener.use(express.json())

listener.post("/set", (req, res) => {
  const stdout = req.body.stdout
  if (typeof stdout !== "string") {
    res.sendStatus(400)
    return
  }
  io.emit("set", { stdout: stdout })

  db.run("INSERT INTO text_based VALUES(0, ?) ON CONFLICT(id) DO UPDATE SET stdout = ?", stdout, stdout)
  res.sendStatus(200)
})

listener.post("/push", (req, res) => {
  const stdout = req.body.stdout
  const letterDelay = req.body.letterDelay
  if (typeof stdout !== "string" || typeof letterDelay != "number") {
    res.sendStatus(400)
    return
  }
  io.emit("push", { stdout, letterDelay })

  db.run("INSERT INTO text_based VALUES(0, ?) ON CONFLICT(id) DO UPDATE SET stdout = stdout || ?", stdout, stdout)
  res.sendStatus(200)
})

listener.listen(4000, () => console.log("Listener ready on port 4000"))
