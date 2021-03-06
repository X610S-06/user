//jshint esversion
require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose')
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const findOrCreate = require('mongoose-findorcreate')
const nodemailer = require('nodemailer')

const app = express()

app.use(express.static('public'))
app.set('view engine', 'ejs')
app.use(
	bodyParser.urlencoded({
		extended: true,
	})
)

//mail configuration
const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: 'somanatha.s.biradar6@gmail.com',
		pass: '*******',
	},
})

//passport
app.use(
	session({
		secret: 'secret',
		resave: false,
		saveUninitialized: false,
	})
)
app.use(passport.initialize())
app.use(passport.session())

//mongoose
mongoose.connect('mongodb://localhost:27017/userDB', { useNewUrlParser: true })

const userSchema = new mongoose.Schema({
	email: String,
	password: String,
	googleId: String,
})

//passport-local-mongoose plugins
userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)

const User = new mongoose.model('User', userSchema)

passport.use(User.createStrategy())

passport.serializeUser(function (user, done) {
	done(null, user.id)
})

passport.deserializeUser(function (id, done) {
	User.findById(id, function (err, user) {
		done(err, user)
	})
})

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL: 'http://localhost:3000/auth/google/secrets',
			userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
		},
		function (accessToken, refreshToken, profile, cb) {
			console.log(profile)

			User.findOrCreate({ googleId: profile.id }, function (err, user) {
				return cb(err, user)
			})
		}
	)
)

app.get('/', function (req, res) {
	res.render('home')
})

app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }))

app.get(
	'/auth/google/secrets',
	passport.authenticate('google', { failureRedirect: '/login' }),
	function (req, res) {
		res.redirect('/secrets')
	}
)

app.get('/login', function (req, res) {
	res.render('login')
})

app.get('/register', function (req, res) {
	res.render('register')
})

app.get('/secrets', function (req, res) {
	res.render('secrets')
})

app.get('/logout', function (req, res) {
	req.logout()
	res.redirect('/')
})

//register route
app.post('/register', function (req, res) {
	User.register({ username: req.body.username }, req.body.password, function (err, user) {
		if (err) {
			console.log('User already Exists')
			res.redirect('/register')
		} else {
			passport.authenticate('local')(req, res, function () {
				const email = req.body.username

				var mailOptions = {
					from: 'somanatha.s.biradar6@gmail.com',
					to: email,
					subject: 'Sending Email using Node.js',
					text: 'That was easy!',
				}

				transporter.sendMail(mailOptions, function (error, info) {
					if (error) {
						console.log(error)
					} else {
						console.log('Email sent: ' + info.response)
					}
				})
				res.redirect('/secrets')
			})
		}
	})
})

//login route
app.post('/login', function (req, res) {
	const user = new User({
		username: req.body.username,
		password: req.body.password,
	})

	req.login(user, function (err) {
		if (err) {
			console.log('User already Exists')
			res.redirect('/register')
		} else {
			passport.authenticate('local')(req, res, function () {
				res.redirect('/secrets')
			})
		}
	})
})

//listening on local port
app.listen(3000, function () {
	console.log('Server started on port 3000.')
})
