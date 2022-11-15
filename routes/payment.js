const express = require("express");
const isAuth = require("../middlewares/isAuth");
const Offer = require("../models/Offer");
const Order = require("../models/Order");
const cloudinary = require("cloudinary").v2;
const stripe = require("stripe")(process.env.STRIPE_SK);

const router = express.Router();

router.post("/payment", isAuth, async (req, res) => {
  try {
    const { stripeToken, title, price, id, owner } = req.body;

    const response = await stripe.charges.create({
      amount: price * 100 + 120,
      currency: "eur",
      description: title,
      source: stripeToken,
    });

    const offer = await Offer.findById(id);

    if (offer?.product_image?.public_id) {
      const offerPics = [];
      offerPics.push(offer.product_image.public_id);

      for (let i = 0; i < offer.product_pictures.length; i++) {
        offerPics.push(offer.product_pictures[i].public_id);
      }

      await cloudinary.api.delete_resources(offerPics);
      await cloudinary.api.delete_folder(`/vinted/offers/${req.body.id}`);
    }
    await offer.delete();

    const newOrder = new Order({
      product_name: title,
      product_price: price,
      owner: owner,
    });

    await newOrder.save();
    res.status(200).json({ response, newOrder });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

module.exports = router;
