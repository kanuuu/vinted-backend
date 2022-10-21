const express = require("express");
const User = require("../models/User");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const isAuth = require("../middlewares/isAuth");
const Offer = require("../models/Offer");
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;

const router = express.Router();

const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

router.post("/user/signup", fileUpload(), async (req, res) => {
  try {
    const { username, email, password, newsletter } = req.body;
    if (!username || !email || !password || !newsletter) {
      return res.status(400).json({
        error: {
          message: "Missing parameter",
        },
      });
    }
    const { avatar } = req.files;
    const salt = uid2(16);
    const hash = SHA256(password + salt).toString(encBase64);
    const token = uid2(64);

    const isUser = await User.findOne({ email: email });
    if (isUser !== null) {
      return res.status(400).json({
        message: "This email is already in use",
      });
    }

    const user = new User({
      email: email,
      newsletter: newsletter,
      token: token,
      hash: hash,
      salt: salt,
    });
    if (req.files?.picture) {
      const avatarToUpload = await cloudinary.uploader.upload(
        convertToBase64(avatar),
        {
          folder: `vinted/users/${user.id}`,
        }
      );
      user.account = { username: username, avatar: avatarToUpload };
    }

    await user.save();

    res.status(200).json({
      username: user.account.username,
      avatar: user.account.avatar.secure_url,
      email: user.email,
      newsletter: user.newsletter,
      token: user.token,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });

    const hash = SHA256(password + user.salt).toString(encBase64);

    if (user.hash === hash) {
      return res.status(200).json({
        id: user.id,
        token: user.token,
        account: {
          username: user.account.username,
          avatar: user.account.avatar.secure_url,
        },
      });
    }

    res.status(400).json({
      message: "Unauthorized",
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

module.exports = router;
