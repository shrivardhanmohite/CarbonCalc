const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const mongoose = require("mongoose");
const session = require("express-session");
require("dotenv").config();   // ✅ load environment variables

// Initialize app
const app = express();

// ✅ Connect to MongoDB process.env.MONGO_URL
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessions
app.use(
  session({
    secret: "carboncalcsecret", // use env var in prod
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }, // 1 hour
  })
);

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Layouts
app.use(expressLayouts);
app.set("layout", "layouts/boilerplate");

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Models
const User = require("./models/user");
const History = require("./models/history");

// Pass session data to views
app.use((req, res, next) => {
  res.locals.userId = req.session.userId || null;
  res.locals.userName = req.session.userName || null;
  next();
});

// ------------------- ROUTES -------------------

// Redirect root to home
app.get("/", (req, res) => {
  res.redirect("/home");
});

// Home
app.get("/home", (req, res) => {
  res.render("home", { title: "Home - Carbon Footprint Calculator" });
});

// About
app.get("/about", (req, res) => {
  res.render("about", { title: "About - Carbon Footprint Calculator" });
});

// Calculator
app.get("/calculator", (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  res.render("index", { title: "Calculator - Carbon Footprint Calculator" });
});

// Login page
app.get("/login", (req, res) => {
  res.render("login", { title: "Login - Carbon Footprint Calculator" });
});

// Signup page
app.get("/signup", (req, res) => {
  res.render("signup", { title: "Sign Up - Carbon Footprint Calculator" });
});

// ------------------- AUTH ROUTES -------------------

// Signup
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) return res.send("⚠️ Passwords do not match!");

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.send("⚠️ User already exists. Please login.");

    const newUser = new User({ name, email, password });
    await newUser.save();

    req.session.userId = newUser._id;
    req.session.userName = newUser.name;

    res.redirect("/calculator");
  } catch (error) {
    console.error(error);
    res.send("❌ Error during signup.");
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.send("❌ Invalid credentials!");

    req.session.userId = user._id;
    req.session.userName = user.name;

    res.redirect("/calculator");
  } catch (error) {
    console.error(error);
    res.send("❌ Error during login.");
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/home");
});

// ------------------- CALCULATOR SAVE HISTORY -------------------
app.post("/calculator", async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });

    const { calculation, suggestion } = req.body;

    const history = new History({
      user: req.session.userId,
      calculation,
      suggestion,
    });

    await history.save();

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "❌ Error saving history" });
  }
});

// ------------------- HISTORY -------------------
app.get("/history", async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect("/login");

    const history = await History.find({ user: req.session.userId }).sort({ date: -1 });
    res.render("history", { title: "Your History", history });
  } catch (error) {
    console.error(error);
    res.send("❌ Error fetching history");
  }
});
app.use((req, res, next) => {
  res.locals.user = req.user || null; // Passport.js attaches req.user when logged in
  next();
});


// ------------------- START SERVER -------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
