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
      "https://dummy-e-commerce.vercel.app",
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
  connectionLimit: process.env.CONNECTIONLIMIT, // Adjust this value based on your requirement
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

// ********************************** signup api starts ********************************
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
          // console.log("Data inserted");
          res.status(200).json({ message: "Form submitted successfully" });
        }
      );
    }
  });
});
// ********************************** signup api ends ********************************

// ********************************** login api starts ********************************
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
        // console.log("Login successfully");
        // const token = jwt.sign({ results, validPassword }, secretKey, {expiresIn: "1h",});
        const token = jwt.sign({ results, validPassword }, secretKey);
        return res
          .status(200)
          .json({ message: "Login successfully", data: results, token: token });
      } else {
        return res.status(401).json({ message: "Incorrect password." });
      }
    }
  });
});
// ********************************** login api ends ********************************

// ********************************** Middleware to verify JWT token starts ********************************
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
// ********************************** Middleware to verify JWT token ends ********************************

// ********************************** protected routes api starts ********************************
app.get("/protected/routes", verifyToken, async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  res.status(200).json({ message: "success", user: req.user });
  // console.log("req.userrrrr", req.user);
});
// ********************************** protected routes api ends ********************************

// ********************************** cartProducts post api starts ********************************
app.post("/post/cartproducts", (req, res) => {
  const {
    id,
    title,
    price,
    quantity,
    brand,
    category,
    description,
    discountPercentage,
    stock,
    thumbnail,
    rating,
    email,
  } = req.body;
  // console.log("req.bodyyyyy", req.body);

  // Check if a record with the same email and title exists
  const checkIfExistsQuery =
    "SELECT id FROM cartproducts WHERE id = ? AND email = ?";
  db.query(checkIfExistsQuery, [id, email], (error, existingProduct) => {
    if (error) {
      console.error("Error checking if product exists", error);
      return res.status(500).json({ message: "Internal server error" });
    } else {
      if (existingProduct.length > 0) {
        // A product with the same email and title already exists, update the record
        const updateProductQuery =
          "UPDATE cartproducts SET title = ?, price = ?, quantity = ?, brand = ?, category = ?, description = ?, discountPercentage = ?, stock = ?, thumbnail = ?, rating = ? WHERE id = ? AND email = ?";
        db.query(
          updateProductQuery,
          [
            title,
            price,
            quantity,
            brand,
            category,
            description,
            discountPercentage,
            stock,
            thumbnail,
            rating,
            id,
            email,
          ],
          (updateError, updateResult) => {
            if (updateError) {
              console.error("Error updating product", updateError);
              return res.status(500).json({ message: "Internal server error" });
            }
            // console.log("Product updated");
            res.status(200).json({
              message: "CartProduct updated successfully",
              data: updateResult,
            });
          }
        );
      } else {
        // No existing product found, insert a new one
        const insertCartQuery =
          "INSERT INTO cartproducts (id, title, price, quantity, brand, category, description, discountPercentage, stock, thumbnail, rating, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        db.query(
          insertCartQuery,
          [
            id,
            title,
            price,
            quantity,
            brand,
            category,
            description,
            discountPercentage,
            stock,
            thumbnail,
            rating,
            email,
          ],
          (insertError, insertResult) => {
            if (insertError) {
              console.error("cartProduct insert error", insertError);
              return res.status(500).json({ message: "Internal server error" });
            }
            // console.log("CartProduct inserted");
            res.status(200).json({
              message: "CartProduct added successfully",
              data: insertResult,
            });
          }
        );
      }
    }
  });
});
// ********************************** cartProducts post api ends ********************************


// ********************************** get cart products api starts ********************************
app.post("/get/cartproducts", (req, res) => {
  const { email } = req.body;
  // console.log("req.body", email);
  // res.send("success")
  const checkEmailMatch = "SELECT * FROM cartproducts WHERE email = ?";
  db.query(checkEmailMatch, [email], (error, results) => {
    if (error) {
      console.error("Error fetching cart products", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    // console.log("Cart products retrieved");
    res
      .status(200)
      .json({ message: "Cart products retrieved successfully", data: results });
  });
});
// ********************************** get cart products api ends ********************************


// ********************************** update products quantity api starts ********************************
app.put("/update/cartproducts/quantity", (req, res) => {
  const { id, quantity, email } = req.body;

  // Update the database for this product
  const updateCartQuery =
    "UPDATE cartproducts SET quantity = ? WHERE id = ? AND email = ?";

  db.query(updateCartQuery, [quantity, id, email], (error, result) => {
    if (error) {
      console.error("cartProduct update error", error);
    } else {
      console.log(`CartProduct with ID ${id} updated successfully`);
    }
  });

  // Send a response back to the frontend
  res.status(200).json({ message: "CartProducts updated successfully" });
});
// ********************************** update products quantity api ends ********************************


// ********************************** cartProducts delete api starts ********************************
app.delete("/delete/cartproducts", (req, res) => {
  const { id, email } = req.query;
  // console.log("id, email", id, email);
  // res.send("success");

  const deleteQuert = `DELETE FROM cartproducts WHERE id = ? AND email = ?`;
  db.query(deleteQuert, [id, email], (error, result) => {
    if (error) {
      console.error("Error product not exists", error);
      return res.status(500).json({ message: "Internal server error" });
    } else {
      res.status(200).json({ message: "Record deleted successfully" });
    }
  });
});
// ********************************** cartProducts delete api ends ********************************


// ********************************** wishlistProducts post api starts ********************************
app.post("/post/wishlistproducts", (req, res) => {
  const {
    id,
    title,
    price,
    quantity,
    brand,
    category,
    description,
    discountPercentage,
    stock,
    thumbnail,
    rating,
    email,
  } = req.body;
  // console.log("post/wishlistproducts bodyyyyy", req.body);

  // Check if a record with the same email and title exists
  const checkIfExistsQuery =
    "SELECT id FROM wishlistproducts WHERE id = ? AND email = ?";
  db.query(checkIfExistsQuery, [id, email], (error, existingProduct) => {
    if (error) {
      console.error("Error checking if product exists", error);
      return res.status(500).json({ message: "Internal server error" });
    } else {
      if (existingProduct.length > 0) {
        // A product with the same email and title already exists, update the record
        const updateProductQuery =
          "UPDATE wishlistproducts SET title = ?, price = ?, quantity = ?, brand = ?, category = ?, description = ?, discountPercentage = ?, stock = ?, thumbnail = ?, rating = ? WHERE id = ? AND email = ?";
        db.query(
          updateProductQuery,
          [
            title,
            price,
            quantity,
            brand,
            category,
            description,
            discountPercentage,
            stock,
            thumbnail,
            rating,
            id,
            email,
          ],
          (updateError, updateResult) => {
            if (updateError) {
              console.error("Error updating product", updateError);
              return res.status(500).json({ message: "Internal server error" });
            }
            // console.log("Product updated");
            res.status(200).json({
              message: "CartProduct updated successfully",
              data: updateResult,
            });
          }
        );
      } else {
        // No existing product found, insert a new one
        const insertCartQuery =
          "INSERT INTO wishlistproducts (id, title, price, quantity, brand, category, description, discountPercentage, stock, thumbnail, rating, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        db.query(
          insertCartQuery,
          [
            id,
            title,
            price,
            quantity,
            brand,
            category,
            description,
            discountPercentage,
            stock,
            thumbnail,
            rating,
            email,
          ],
          (insertError, insertResult) => {
            if (insertError) {
              console.error("cartProduct insert error", insertError);
              return res.status(500).json({ message: "Internal server error" });
            }
            // console.log("CartProduct inserted");
            res.status(200).json({
              message: "CartProduct added successfully",
              data: insertResult,
            });
          }
        );
      }
    }
  });
});
// ********************************** wishlistProducts post api ends ********************************


// ********************************** get wishlistProducts api starts ********************************
app.post("/get/wishlistproducts", (req, res) => {
  const { email } = req.body;
  // console.log("req.body", email);
  // res.send("success")
  const checkEmailMatch = "SELECT * FROM wishlistproducts WHERE email = ?";
  db.query(checkEmailMatch, [email], (error, results) => {
    if (error) {
      console.error("Error fetching cart products", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    // console.log("Cart products retrieved");
    res
      .status(200)
      .json({ message: "Cart products retrieved successfully", data: results });
  });
});
// ********************************** get cwishlistProducts api ends ********************************


// ********************************** update products quantity api starts ********************************
app.put("/update/wishlistproducts/quantity", (req, res) => {
  const { id, quantity, email } = req.body;
  // console.log("/update/wishlistproducts/quantity", id, quantity, email);

  // Update the database for this product
  const updateCartQuery =
    "UPDATE wishlistproducts SET quantity = ? WHERE id = ? AND email = ?";

  db.query(updateCartQuery, [quantity, id, email], (error, result) => {
    if (error) {
      console.error("wishlistProduct update error", error);
    } else {
      console.log(`wishlistProduct with ID ${id} updated successfully`);
    }
  });

  // Send a response back to the frontend
  res.status(200).json({ message: "wishlistproducts updated successfully" });
});
// ********************************** update products quantity api ends ********************************


// ********************************** wishlistproducts delete api starts ********************************
app.delete("/delete/wishlistproducts", (req, res) => {
  const { id, email } = req.query;
  // console.log("id, email", id, email);
  // res.send("success");

  const deleteQuert = `DELETE FROM wishlistproducts WHERE id = ? AND email = ?`;
  db.query(deleteQuert, [id, email], (error, result) => {
    if (error) {
      console.error("Error product not exists", error);
      return res.status(500).json({ message: "Internal server error" });
    } else {
      res.status(200).json({ message: "Record deleted successfully" });
    }
  });
});
// ********************************** wishlistproducts delete api ends ********************************


// Listen port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
