const express = require("express");
const isAuth = require("../middlewares/isAuth");
const Offer = require("../models/Offer");
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;

const router = express.Router();

const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

router.post("/offer/publish", isAuth, fileUpload(), async (req, res) => {
  try {
    const { title, description, price, condition, city, brand, size, color } =
      req.body;

    if (
      !title ||
      !description ||
      !price ||
      !condition ||
      !city ||
      !brand ||
      !size ||
      !color
    ) {
      return res.status(400).json({
        error: {
          message: "Missing parameter",
        },
      });
    }

    const newOffer = new Offer({
      product_name: title,
      product_description: description,
      product_price: price,
      product_details: [
        { condition },
        { city },
        { brand },
        { size },
        { color },
      ],
      owner: req.user,
    });
    if (req.files?.picture) {
      const offerPic = await cloudinary.uploader.upload(
        convertToBase64(picture),
        {
          folder: `vinted/offers/${newOffer.id}`,
        }
      );
      newOffer.product_image = offerPic;
    }
    await newOffer.save();

    res.status(200).json(newOffer);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.put("/offer/edit", isAuth, fileUpload(), async (req, res) => {
  try {
    const offer = await Offer.findById(req.body.id).populate(
      "owner",
      "account token"
    );

    if (req.token !== offer.owner.token) {
      return res.status(401).json({
        error: {
          message: "Unauthorized",
        },
      });
    }

    const { title, desc, price, condition, city, brand, size, color } =
      req.body;
    if (offer === null) {
      return res.status(400).json("No offer found");
    }

    title ? (offer.product_name = title) : offer.product_name;
    desc ? (offer.product_description = desc) : offer.product_description;
    price ? (offer.product_price = price) : offer.product_price;
    offer.product_details = [
      condition
        ? { condition }
        : { condition: offer.product_details[0].condition },
      city ? { city } : { city: offer.product_details[1].city },
      brand ? { brand } : { brand: offer.product_details[2].brand },
      size ? { size } : { size: offer.product_details[3].size },
      color ? { color } : { color: offer.product_details[4].color },
    ];

    if (req.files?.picture) {
      await cloudinary.uploader.destroy(offer.product_image.public_id);
      const newPic = await cloudinary.uploader.upload(
        convertToBase64(req.files.picture),
        {
          folder: `/vinted/offers/${offer.id}`,
        }
      );
      offer.product_image = newPic;
    }

    await offer.save();

    res.status(200).json(offer);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.delete("/offer/delete", isAuth, fileUpload(), async (req, res) => {
  try {
    const offer = await Offer.findById(req.body.id).populate("owner");
    if (req.token !== offer.owner.token) {
      return res.status(401).json({
        error: {
          message: "Unauthorized",
        },
      });
    }

    if (offer?.product_image?.public_id) {
      const offerPics = offer.product_image.public_id;

      await cloudinary.uploader.destroy(offerPics);
      await cloudinary.api.delete_folder(`/vinted/offers/${req.body.id}`);
    }

    await offer.delete();
    res.status(200).json({ message: `Offer ${offer.id} deleted` });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.get("/offers", async (req, res) => {
  try {
    const { title, priceMin, priceMax, sort, page } = req.query;
    const filters = {};
    const sortFilter = {};

    if (title) {
      filters.product_name = new RegExp(title, "i");
    }

    if (priceMin) {
      filters.product_price = { $gte: parseInt(priceMin) };
    } else {
      filters.product_price = { $gte: 0 };
    }

    if (priceMax) {
      if (!filters.product_price) {
        filters.product_price = { $lte: parseInt(priceMax) };
      } else {
        filters.product_price.$lte = parseInt(priceMax);
      }
    } else {
      filters.product_price = { $lte: 100000 };
    }

    if (sort === "price-asc") {
      sortFilter.product_price = "asc";
    } else if (sort === "price-desc") {
      sortFilter.product_price = "desc";
    }

    const itemsPerPage = 5;
    const pageIndex = parseInt(page) * itemsPerPage - itemsPerPage;

    const offers = await Offer.find(filters)
      .sort(sortFilter)
      .limit(itemsPerPage)
      .skip(pageIndex);
    //.select("product_name product_price");

    const offerCount = await Offer.countDocuments(filters);
    res.status(200).json({ count: offerCount, offers });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findOne({ _id: req.params.id }).populate(
      "owner",
      "account"
    );
    if (offer === null) {
      return res.status(400).json({
        error: {
          message: "No offer found",
        },
      });
    }
    res.status(200).json(offer);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

module.exports = router;
