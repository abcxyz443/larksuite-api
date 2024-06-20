const express = require('express');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const app = express();
const router_1 = require("./order-api");
const router_2 = require("./product-api");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', router_1);
app.use('/', router_2);

const port = 3000;
app.listen(port, () => {
  console.log("Server started on port:", port);
});
