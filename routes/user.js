const router = require('express').Router();
let User = require('../models/user.model');
const generateToken = require('../utils/generate-token.js');
const Buffer = require('buffer').Buffer;

const validateRegisterInput = require("../utils/validator.js");

router.route('/').get(async (req, res) => {
  try {
    const users = await User.find(); // Fetch user data from MongoDB
    const formattedUsers = users.map(user => {
      let dpImage = null;
      
      // Check if dpImage is available and has the data field
      if (user.dpImage && user.dpImage.data) {
        // Convert binary to base64
        dpImage = `data:image/jpeg;base64,${user.dpImage.data.toString('base64')}`;
      }

      return {
        id: user._id.toString(), // Convert ObjectId to string
        username: user.username,
        dpImage // The image will be null if dpImage is not available
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error); // Log the error for debugging
    res.status(500).json({ error: error.message });
  }
});


router.route('/register').post(async (req, res) => {
  console.log(req.body);
  const { errors, isValid } = validateRegisterInput(req.body);
  if (!isValid) {
    return res.status(400).json(errors);
  }

  try {
    // Check if username already exists
    let user = await User.findOne({ username: req.body.username });
    if (user) {
      return res.status(400).json({ username: "Username already exists" });
    }

    // Check if email already exists
    user = await User.findOne({ email: req.body.email });
    if (user) {
      return res.status(400).json({ email: "Email already exists" });
    }

    const { username, password, email, dpImage } = req.body;

    // Create new user instance
    const newUser = new User({
      username,
      password,
      email,
      dpImage: dpImage ? {
        data: Buffer.from(dpImage, 'base64'), // Convert base64 to buffer
        contentType: dpImage.contentType,
        uploadedAt: new Date()
      } : undefined // Set dpImage if provided
    });

    // Save the user to the database
    const savedUser = await newUser.save();

    // Generate JWT token with id and username
    const token = generateToken({ id: savedUser._id, username: savedUser.username });

    // Return success response with token
    res.status(201).json({ message: 'User registered successfully', token });
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ error: 'An error occurred during registration' });
  }
});


router.route('/login').post(async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ success: false, message: "Username not found" });
    }

    // Check if password matches
    const isMatch = (password === user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect password" });
    }

    // Generate JWT token with user id and username
    const token = generateToken({ id: user._id, username: user.username });

    // Return the token to the client
    res.status(200).json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, message: 'An error occurred during login' });
  }
});

module.exports = router;