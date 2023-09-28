
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//import encrypt from 'mongoose-encryption'
//import md5 from "md5"
// import bcrypt from "bcrypt";
// const saltRounds =10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret:"Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(""+process.env.MONGODB_ATLAS) 

const userSchema = new mongoose.Schema({
    email: "String",
    password: "String",
    googleId: "String",
    secret: "String"
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields:["password"]}); //level 2 database encryption caesar cypher

const User = new mongoose.model("User", userSchema)

passport.use(User.createStrategy());

passport.serializeUser(function(user,done){
    done(null,user)
});
passport.deserializeUser(function(user,done){
    done(null,user)
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req,res) =>{
    res.render("home.ejs")
});

app.get("/auth/google", passport.authenticate("google", {scope:["profile"]}));

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  });

app.get("/login", (req,res) =>{
    res.render("login.ejs")
});

app.get("/register", (req,res) =>{
    res.render("register.ejs")
});

app.get("/secrets", (req,res) =>{
  User.find({"secret":{$ne:null}}) .then((foundUsers)=>{
    res.render("secrets.ejs", {usersWithSecrets: foundUsers})
  })
})

app.get("/submit", (req,res)=>{
    if ( req.isAuthenticated()){
        res.render("submit.ejs")
    } else {
        res.redirect("/login")
    }
})


app.post("/submit", (req,res)=>{
    const submittedSercret = req.body.secret;
    console.log(req.user._id)
    User.findById(req.user._id).then((foundUser)=>{
            if (foundUser) {
                foundUser.secret = submittedSercret;
                foundUser.save();
                res.redirect("/secrets")
            } else {
                console.error();
            }
            });
});
// app.post("/register", (req,res) =>{   //md5 hashing 
//     const newUser = new User ({
//         email: req.body.username,
//         password: md5(req.body.password)
//     });
//     newUser.save();
//     res.render("secrets.ejs");  
//     console.error();
// })
// app.post("/register", (req,res) =>{  //salting and hashing
//     bcrypt.genSalt(saltRounds, function(err, salt) {
//         bcrypt.hash(req.body.password, salt, function(err, hash) {
//           const newUser = new User ({
//         email: req.body.username,
//         password: hash
//     });
//     newUser.save();
//     res.render("secrets.ejs");  
//     console.error();
//         });
//     });
// })

app.post("/register", (req,res) =>{  //passport
   User.register({username:req.body.username}, req.body.password, function(err,user){
    if (err){
        console.log(err)
        res.redirect("/")
    } else {
        passport.authenticate("local")(req,res, function() {
            res.render("secrets.ejs");
        })
    }
   })
})

// app.post("/login", (req,res) =>{      //md5 hashing
//     const username = req.body.username;
//     const password = md5(req.body.password);
//     User.findOne({email: username}) .then ((foundUser)=>{
//     if (foundUser.password === password) {
//         res.render("secrets.ejs")
//     } else {
//         console.error();
//     }
//     })
// })

// app.post("/login", (req,res) =>{           //salting and hashing
//     const username = req.body.username;
//     const password = req.body.password;
//     User.findOne({email: username}) .then ((foundUser)=>{
//         bcrypt.compare(password, foundUser.password, function(err, result) {
//               if (result === true) {
//         res.render("secrets.ejs")
//            } else {
//             console.log(err)
//            }
//         });
//     })
// })

app.post("/login", (req,res) =>{         //passport
 const user = new User({
    username:req.body.username,
    password: req.body.password
 });
 req.login(user, function(err){
    if (err){
        console.log(err)
    } else {
        passport.authenticate("local")(req,res, function(){
            res.redirect("/secrets")
        })
    }
 })
})



app.get("/logout", (req,res)=>{
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
})


app.listen(3000, ()=>{
    console.log("Server is running on post 3000")
});


// a@test.com - 123456
// b@test.com - qwerty
// c@test.com - asdfgh
// d@test.com - zxcvbn
// e@test.com - 123456