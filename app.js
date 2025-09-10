const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const mongoose = require("mongoose");
const session = require("express-session");
require("dotenv").config();

// Initialize app
const app = express();

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessions
app.use(
  session({
    secret: "carboncalcsecret", // ⚠️ use env var in production
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

// ------------------- AUTH MIDDLEWARE -------------------
function isLoggedIn(req, res, next) {
  if (req.session.userId) return next();
  res.redirect("/login");
}

// ------------------- ROUTES -------------------

// Redirect root to home
app.get("/", (req, res) => res.redirect("/home"));

// Home
app.get("/home", (req, res) => {
  res.render("home", { title: "Home - Carbon Footprint Calculator" });
});

// About
app.get("/about", (req, res) => {
  res.render("about", { title: "About - Carbon Footprint Calculator" });
});

// Calculator
app.get("/calculator", isLoggedIn, (req, res) => {
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
    if (password !== confirmPassword)
      return res.send("⚠️ Passwords do not match!");

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
app.post("/calculator", isLoggedIn, async (req, res) => {
  try {
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
// ------------------- HISTORY -------------------
app.get("/history", isLoggedIn, async (req, res) => {
  try {
    const { sort, filter } = req.query;
    let query = { user: req.session.userId };

    const now = new Date();

    // Filter by year
    if (filter === "year") {
      query.createdAt = {
        $gte: new Date(now.getFullYear(), 0, 1),
        $lte: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      };
    }
    // Filter by month
    else if (filter === "month") {
      query.createdAt = {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    }

    // Sorting
    let sortOption = { createdAt: -1 }; // default newest first
    if (sort === "oldest") sortOption = { createdAt: 1 };

    const history = await History.find(query).sort(sortOption);

    res.render("history", { title: "Your History", history });
  } catch (error) {
    console.error(error);
    res.send("❌ Error fetching history");
  }
});


// ------------------- CHATBOT -------------------
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Page (only logged in users)
app.get("/chatbot", isLoggedIn, (req, res) => {
  res.render("chatbot", { title: "Chatbot - Carbon Footprint Calculator" });
});

// API (only logged in users)
app.post("/chatbot", isLoggedIn, async (req, res) => {
  try {
    const { question } = req.body;
    const prompt = `You are an eco-friendly chatbot that helps users understand carbon footprint. Keep answers clear, friendly, and helpful. Question: ${question}`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    res.json({ answer });
  } catch (err) {
    console.error("Chatbot error:", err);
    res.json({ answer: "⚠️ Sorry, I couldn't fetch an answer right now." });
  }
});

// ------------------- START SERVER -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
