// AuthController.js
var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var config = require('../../config');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
var User = require('../models/User');
var nodeMailer = require('nodemailer'),

sendEmail = async (email) => {
  let transporter = nodeMailer.createTransport(config.exmailSetup);
  let mailOptions = {
    to: email.to, // list of receivers
    subject: email.subject, // Subject line
    text: email.body, // plain text body
    html: email.isHtml ? email.htmlCode : ''// html body
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error in email send", error);
    }
    console.log('Message %s sent: %s', info.messageId, info.response);
  });
}


randomString = (length) => {
  return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1).toUpperCase();
}

// LOGIN USER 
router.post('/login', (req, res) => {
  console.info('User login process...');

  User.findOne({ userEmail: req.body.userEmail }, (err, result) => {
    if (err) {
      console.error('There was a problem for finding the user to login');
      return res.status(500).json({ message: "There was a problem for finding the user to login." });
    } else if (result) {
      console.info('result', result);
      var passwordIsValid = bcrypt.compareSync(req.body.password, result.password);
      if (!passwordIsValid) {
        console.error('Invalid password entered!!');
        return res.status(401).send({ auth: false, token: null, message: "Invalid password entered!!" });
      } else {
        console.info('User loged in successfully');
        var token = jwt.sign({ id: result._id, email: result.userEmail, role: result.role }, config.secret, {
          expiresIn: 86400 // expires in 24 hours
        });
        return res.status(200).json({ token: token, message: "User loged in successfully" });
      }
    }
    console.info('No operation performed!!');
    return res.status(200).json({ message: "Something went wrong" });
  });
});

// FORGOT PASSWORD
router.post('/forgot-password', function (req, res) {
  console.info('User forgot-password process...');
  
  User.findOne({ userEmail: req.body.userEmail }, (err, result) => {
    if (err) {
      console.error('There was a problem for finding the user to forgot-password');
      return res.status(500).json({ message: "There was a problem for finding the user to forgot-password." });
    } else if (result) {
     
      var autoGeneratedPassword = randomString(5);
      var hashedPassword = bcrypt.hashSync(autoGeneratedPassword, 8);
     
      result.password = hashedPassword;
      result.updatedAt = new Date();

      const user = User.findOneAndUpdate({ _id: result._id }, result, (err, updateResult) => {
        if (updateResult) {
          const email = {
            to: 'nshivakumar.it@gmail.com', // list of receivers
            subject: 'Forgot Password', // Subject line
            isHtml: true,
            htmlCode: '<html><b>Hi ' + updateResult.usersName
              + '</b><br/> <br/>Your new changed password : ' + autoGeneratedPassword
              + '<br/><br/>Thanks & Regards<br/>Shivakumar N </html>'
          }
          sendEmail(email);
          console.info('Password changed and sent to ', req.body.userEmail);
          return updateResult;
        } else if (err){
          console.error('There was a problem for updating user');
          return null;
        }
      });
      if (user._update) {
        return res.status(200).json({ message: "Password changed and sent to " + req.body.userEmail + " email" });
      }
    }
    console.info('No operation performed!!');
    return res.status(200).json({ message: "Something went wrong" });
  });
});

// RESET PASSWORD
router.post('/reset', function (req, res) {
  console.info('User reset-password process...');

  return User.findOne({ _id: req.body.id }, (err, result) => {
    if (err) {
      console.error('There was a problem for finding the user to reset-password');
      return res.status(500).json({ message: "There was a problem for finding the user to reset-password." });
    } else if (result) {
      var passwordIsValid = bcrypt.compareSync(req.body.oldPassword, result.password);
      if (!passwordIsValid) {
        console.error('Invalid old password entered!!');
        return res.status(401).send({ auth: false, token: null, message: "Invalid password entered!!" });
      }
      var hashedPassword = bcrypt.hashSync(req.body.newPassword, 8);
      result.password = hashedPassword;
      result.updatedAt = new Date();
      const user = User.findOneAndUpdate({ _id: result._id }, result, (err, updateResult) => {
        if (updateResult) {
          console.info('Password has been changed successfully');
          return updateResult;
        } else if (err) {
          console.error('There was a problem for updating user for reset password');
          return null;
        }
      });
      if (user._update){
        return res.status(200).json({ message: "Password has been changed successfully" });
      } 
    }
    console.info('No operation performed!!');
    return res.status(200).json({ message: "Something went wrong" });
  });
});

module.exports = router;