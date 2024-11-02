const router = require('express').Router();
let User = require('../models/user.model');
const generateToken = require('../utils/generate-token.js');
const Buffer = require('buffer').Buffer;
const bcrypt = require('bcrypt');

const saltRounds = 10;
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
        likes: user.likes,
        dpImage // The image will be null if dpImage is not available
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error); // Log the error for debugging
    res.status(500).json({ error: error.message });
  }
});

router.route('/:id').get(async (req, res) => {
  const { id } = req.params; // Get the user ID from the request parameters

  try {
    const user = await User.findById(id); // Fetch user data from MongoDB by ID

    if (!user) {
      return res.status(404).json({ error: 'User not found' }); // Handle case where user is not found
    }

    // Format dpImage
    let dpImage = null;
    if (user.dpImage && user.dpImage.data) {
      dpImage = `data:${user.dpImage.contentType};base64,${user.dpImage.data.toString('base64')}`; // Convert binary to base64 for dpImage
    }

    // Format profileImages to base64
    const profileImages = user.profileImages.map(image => ({
      id: image._id,
      contentType: image.contentType,
      data: `data:${image.contentType};base64,${image.data.toString('base64')}` // Convert binary to base64
    }));

    // Construct the response object
    const formattedUser = {
      id: user._id.toString(), // Convert ObjectId to string
      email: user.email,
      username: user.username,
      bio: user.bio,
      likes: user.likes,
      dpImage, // The image will be null if dpImage is not available
      profileImages // Include formatted profileImages
    };

    res.json(formattedUser); // Send the user data as response
  } catch (error) {
    console.error('Error fetching user:', error); // Log the error for debugging
    res.status(500).json({ error: error.message });
  }
});

router.route('/:id').patch(async (req, res) => {
  const { id } = req.params; // Get the user ID from the request parameters

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { $inc: { likes: 1 } }, // Increment the 'likes' field by 1
      { new: true } // Return the updated document
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' }); // Handle case where user is not found
    }

    res.json("User Liked"); // Send the updated user data as response
  } catch (error) {
    console.error('Error updating likes:', error);
    res.status(500).json({ error: error.message });
  }
});


router.route('/:id').put(async (req, res) => {
  const { id } = req.params; // Get user ID from URL parameters
  const { username, bio, dpImage } = req.body; // Destructure the fields you want to update

  try {
    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Optionally check for unique fields like username
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ username: 'Username already exists' });
      }
      user.username = username; // Update username
    }

    // Update bio if provided
    if (bio !== undefined) { // Check if bio is provided
      user.bio = bio; // Update bio
    }

    // Update dpImage if provided
    if (dpImage) {
      user.dpImage = {
        data: Buffer.from(dpImage, 'base64'), // Convert base64 to buffer
        contentType: 'image/jpeg', // You can set this based on your front-end
        uploadedAt: new Date(),
      };
    }

    // Save the updated user details
    const updatedUser = await user.save();
    const token = generateToken({ id: updatedUser._id, username: updatedUser.username });

    // Return success response with updated user details
    res.status(200).json({ message: 'User details updated successfully', token, id: updatedUser._id });
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ error: 'An error occurred while updating user details' });
  }
});

router.route('/image').post(async (req, res) => {
  const { userId, image } = req.body; // Get the token and image from the request body

  try {
    const user = await User.findById(userId); // Fetch user data from MongoDB by ID

    if (!user) {
      return res.status(404).json({ error: 'User not found' }); // Handle case where user is not found
    }

    // Check if the image file is available
    if (!image) {
      return res.status(400).json({ error: 'No image uploaded' }); // Handle case where no image is uploaded
    }

    // Decode the Base64 string
    const base64Data = image.replace(/^data:image\/jpeg;base64,/, ''); // Adjust the prefix based on your image type
    const buffer = Buffer.from(base64Data, 'base64'); // Convert Base64 string to buffer

    // Create profile image object
    const newProfileImage = {
      data: buffer, // Use the decoded buffer
      contentType: 'image/jpeg', // Set the content type (adjust if necessary)
      uploadedAt: new Date() // Optionally set the uploaded date
    };

    // Push the new profile image to the user's profileImages array
    user.profileImages.push(newProfileImage);
    await user.save(); // Save the updated user document

    res.status(201).json({ message: 'Profile image uploaded successfully' }); // Respond with success message
  } catch (error) {
    console.error('Error uploading profile image:', error); // Log the error for debugging
    res.status(500).json({ error: error.message }); // Respond with error message
  }
});
router.route('/image/:imageId').delete(async (req, res) => { 
  const { userId } = req.body; // Get userId from request body
  const { imageId } = req.params; // Get imageId from request parameters

  try {
    // Fetch the user from the database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the image index in profileImages array
    const imageIndex = user.profileImages.findIndex(
      (img) => img._id.toString() === imageId
    );

    // Check if the image exists
    if (imageIndex === -1) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Remove the image from profileImages array
    user.profileImages.splice(imageIndex, 1);
    await user.save(); // Save the updated user document

    res.status(200).json({ message: 'Profile image deleted successfully' });
  } catch (error) {
    console.error('Error deleting profile image:', error); // Log the error for debugging
    res.status(500).json({ error: 'An error occurred while deleting the profile image' });
  }
});

// Registration Route
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

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user instance with hashed password
    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      dpImage: dpImage ? {
        data: Buffer.from(dpImage, 'base64'), // Convert base64 to buffer
        contentType: dpImage.contentType,
        uploadedAt: new Date()
      } : undefined, // Set dpImage if provided
      bio: "",
      likes: 0
    });

    // Save the user to the database
    const savedUser = await newUser.save();

    // Generate JWT token with id and username
    const token = generateToken({ id: savedUser._id, username: savedUser.username });

    // Return success response with token
    res.status(201).json({ message: 'User registered successfully', token, id: savedUser._id });
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ error: 'An error occurred during registration' });
  }
});

// Login Route
router.route('/login').post(async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ success: false, message: "Username not found" });
    }

    // Check if password matches by comparing hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect password" });
    }

    // Generate JWT token with user id and username
    const token = generateToken({ id: user._id, username: user.username });

    // Return the token to the client
    res.status(200).json({ success: true, token, id: user._id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'An error occurred during login' });
  }
});


module.exports = router;