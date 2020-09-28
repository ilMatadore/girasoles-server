const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const serverless = require("serverless-http");
const knex = require("knex");
const sendEmail = require("./mail.js");

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

const db = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    user: "postgres",
    password: "****",
    database: "girasolesdb",
  },
});

const database = {
  users: [
    {
      id: "123",
      first_name: "Agustin",
      last_name: "Ramone",
      email: "john@gmail.com",
      password: "cookies",
      joined: new Date(),
    },
    {
      id: "124",
      first_name: "Sally",
      last_name: "Dee",
      email: "sally@gmail.com",
      password: "bananas",
      joined: new Date(),
    },
  ],
};

app.get("/", (req, res) => {
  res.json(database.users);
});

app.post("/", (req, res) => {
  db.select("email", "hash")
    .from("login")
    .where("email", req.body.email)
    .then((data) => {
      const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
      isValid
        ? db
            .select("*")
            .from("users")
            .where("email", req.body.email)
            .then((user) => {
              res.json(user[0]);
            })
            .catch((err) => res.status(400).json("Unable to get user"))
        : res.status(400).json("wrong credentials");
    })
    .catch((err) => res.status(400).json("wrong credentials"));
});

app.post("/register", (req, res) => {
  const {
    email,
    first_name,
    last_name,
    password,
    address,
    city,
    postal,
    state,
    phone,
    country,
  } = req.body;

  const hash = bcrypt.hashSync(password);

  db.transaction((trx) => {
    trx
      .insert({
        hash: hash,
        email: email,
      })
      .into("login")
      .returning("email")
      .then((loginEmail) => {
        return trx("users")
          .returning("*")
          .insert({
            first_name: first_name,
            last_name: last_name,
            email: loginEmail[0],
            address: address,
            city: city,
            postal: postal,
            country: country,
            state: state,
            phone: phone,
            joined: new Date(),
          })
          .then((user) => {
            res.json(user[0]);
          });
      })
      .then(trx.commit)
      .catch(trx.rollback);
  }).catch((err) => res.status(400).json("unable to register"));
});

app.get("/profile/:id", (req, res) => {
  const { id } = req.params;

  db.select("*")
    .from("users")
    .where("id", id)
    .then((user) => {
      user.length ? res.json(user[0]) : res.status(400).json("Not found");
    })
    .catch((err) => res.status(400).json("Error getting user"));
});

app.put("/profile/:id", (req, res) => {
  const { id } = req.params;

  const {
    first_name,
    last_name,
    address,
    city,
    postal,
    state,
    phone,
    country,
  } = req.body;

  db("users")
    .where({ id: id })
    .update({
      first_name: first_name,
      last_name: last_name,
      address: address,
      city: city,
      postal: postal,
      country: country,
      state: state,
      phone: phone,
    })
    .then((user) => {
      user === 1
        ? db
            .select("*")
            .from("users")
            .where("id", id)
            .then((user) => {
              user.length
                ? res.json(user[0])
                : res.status(400).json("Not found");
            })
        : console.log("nunu");
    });
  // .catch((err) => res.status(400).json("Error getting user"));
});

app.post("/contact", (req, res) => {
  const { first_name, last_name, email, phone, message } = req.body;

  sendEmail(email, first_name, last_name, phone, message, function (err, data) {
    if (err) {
      res.status(500).json({ message: "Internal Error" });
    } else {
      res.status(200).json({ message: "Email Sent!" });
    }
  });
});

app.listen(3001, () => {
  console.log("app is running on port 3001");
});

module.exports.handler = serverless(app);
