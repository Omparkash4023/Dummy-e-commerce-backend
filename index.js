const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 4000;
const secretKey = process.env.SECRETKEY;

// app.use(cors());
// Configure CORS to allow requests from specific origins (including localhost)
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://dummy-e-commerce-backend.onrender.com",
    ],
    credentials: true, // Include credentials (e.g., cookies) in CORS requests if needed
  })
);
app.use(express.json());

// MySQL Database Configuration
const db = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
});

// // MySQL Database Configuration of live
// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "dummy-e-commerce",
// });

// Connect to the MySQL database
db.connect((error) => {
  if (error) {
    console.error("Error connecting to the database:", error);
    return;
  }
  console.log("Connected to MySQL database");
});

// singup api
app.post("/post/signup", async (req, res) => {
  const { username, email, password } = req.body;

  // Check if the email already exists in the database
  const checkEmailQuery = "SELECT * FROM signup WHERE email = ?";
  db.query(checkEmailQuery, [email], async (error, results) => {
    if (error) {
      console.error("Database error-osssssss:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (results.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    } else {
      const saltPassword = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, saltPassword);

      const insertUserQuery =
        "INSERT INTO signup (username, email, password) VALUES (?, ?, ?)";
      db.query(
        insertUserQuery,
        [username, email, hashPassword],
        (err, result) => {
          if (err) {
            console.error("Table error:", err);
            return res.status(500).json({ message: "Internal server error" });
          }
          console.log("Data inserted");
          res.status(200).json({ message: "Form submitted successfully" });
        }
      );
    }
  });
});

// login api
app.post("/post/login", async (req, res) => {
  // res.status(200).json({ message: "form submitted successfully" });
  const { email, password } = req.body;
  // console.log("reqqqqqqqqqqqqq", req.body)
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  // Check if the email exists in the database
  const checkEmailQuery = "SELECT * FROM signup WHERE email = ?";
  db.query(checkEmailQuery, [email], async (error, results) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
    if (results.length === 0) {
      return res.status(401).json({ message: "Email not found." });
    } else {
      const validPassword = await bcrypt.compare(password, results[0].password);

      if (validPassword) {
        console.log("Login successfully");
        const token = jwt.sign({ results, validPassword }, secretKey, {
          expiresIn: "1h",
        });
        return res
          .status(200)
          .json({ message: "Login successfully", data: results, token: token });
      } else {
        return res.status(401).json({ message: "Incorrect password." });
      }
    }
  });
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Token verification failed", error: error.message });
  }
};

// protected api
app.get("/protected/routes", verifyToken, async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  res.status(200).json({ message: "success", user: req.user });
  console.log("req.userrrrr", req.user);
});

// Listen port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
