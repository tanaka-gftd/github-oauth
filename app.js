var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');

//GitHubのOAuth認証に必要なモジュールやオブジェクトを導入
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;

//本アプリを、GitHubのOAuthと連携するために、GitHubで生成したIDなどを設定
const GITHUB_CLIENT_ID = '5667ee4bf710c92e1137';
const GITHUB_CLIENT_SECRET = 'e98f5928c2862b8bfca33d3a4694fa81f3f4db4c';

//認証したユーザーの情報の保存方法を設定
passport.serializeUser(function (user, done) {
  done(null, user);
});

//認証したユーザーの情報の読み出し方法を設定
passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

//passportモジュールに、passport-github2のStrategyオブジェクトを設定
passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: 'http://localhost:8000/auth/github/callback'
},
  function (accessToken, refreshToken, profile, done) {

    //認証後に実行する処理を、 process.nextTick 関数を利用して設定
    process.nextTick(function () {  
      return done(null, profile);
    });
  }
));


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var photosRouter = require('./routes/photos');

var app = express();
app.use(helmet());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//express-session と passport でセッションを利用することは設定
app.use(
  session({ 
    secret: 'db5b11cd9d785f08', 
    resave: false, 
    saveUninitialized: false 
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/photos', photosRouter);

//GitHubへの認証のための処理を、GETで /auth/githubへアクセスした際に行うように設定
app.get(
  '/auth/github',
  passport.authenticate('github', { scope: ['user:email'] }), //GitHubのOAuth2.0で認可される権限の範囲を設定
  function (req, res) {
    /* リクエストが行われた際の処理はここに記述（今回は何もしない） */
});

//GitHubで認証を行った後の処理
app.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }), //認証失敗時は再ログインを促すためにログイン画面へ遷移
  function (req, res) {
    res.redirect('/');
});

// /login にアクセスした時は、login.pugテンプレートを表示
app.get('/login', function(req, res) {
  res.render('login');
});

// /logout に GETでアクセスがあった時に、ログアウト処理を実施
app.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if(err) return next (err);
    res.redirect('/');
  });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
