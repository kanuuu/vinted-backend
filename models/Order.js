const mongoose = require("mongoose");

const Order = mongoose.model("Order", {
  product_name: { type: String },
  product_price: { type: Number },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

module.exports = Order;
