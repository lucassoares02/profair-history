const express = require("express");
const cors = require("cors");
const app = express();

const routes = require("@routes");

app.use(cors({ origin: "*", allowedHeaders: "X-Requested-With, Content-Type, user-id, platform", exposedHeaders: ["user-id", "platform"] }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/", routes);

module.exports = app;
