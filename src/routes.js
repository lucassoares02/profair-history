const router = require("express").Router();

const History = require("@controller/History");

router.get("/history", History.find);

module.exports = router;
