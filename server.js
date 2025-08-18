const express = require("express");
const path = require("path");
const nunjucks = require("nunjucks");
const dotenv = require("dotenv").config();
const session = require("express-session");
const app = express();
const cors = require('cors');
const ordersRoutes = require('./routes/orders');
const positionsRoutes = require('./routes/positions');
const userRoutes = require('./routes/users');
const mainRoutes = require('./routes/index');
const bodyParser = require("body-parser");
const { photoPath, dataDir, localesDir, availabeLanguages, defaultLanguage } = require('./config');
const cookieParser = require('cookie-parser');
const i18n = require('i18n');
const nunjucksSetup = require('./nunjucks-setup');
const { default: I18NexFsBackend } = require("i18next-fs-backend");

i18n.configure({
	locales: availabeLanguages,
	directory: localesDir,
	defaultLocale: defaultLanguage,
	cookie: 'lang',
	register: global,
	queryParameter: 'lang',
	objectNotation: true,
	autoReload: true

});


app.use(cookieParser())
app.use(i18n.init)

app.use(cors({
	origin: 'http://192.168.0.8',
	methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT'],
	credentials: true
}));
app.use((req, res, next) => {
	res.locals.locale = defaultLanguage;
	i18n.setLocale(req, req.cookies.lang || defaultLanguage);
	next();
});

const env = nunjucksSetup.configure(app);

app.set('view engine', 'njk');

console.log('defaultLanguage =', i18n.getLocale());

if (process.env.PRODUCTION) {
	console.log('tu')
	app.use(session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: false,
			httpOnly: true,
			sameSite: "lax",
			maxAge: 1000 * 60 * 60 * 8,
			domain: "e-orders.eu"
		}
	}));
	app.set('trust proxy', 1);
}

else if (process.env.TEST_INTERNET) {
	console.log('tu 2')
	app.use(session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: false,
			httpOnly: true,
			sameSite: "lax",
			maxAge: 1000 * 60 * 60 * 8,
			domain: "eform.tkproject.eu"
		}
	}));
	app.set('trust proxy', 1);
}

else {
	console.log('tu3')
	app.use(session({

		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: false,
			httpOnly: true,
			sameSite: "lax",
			maxAge: 1000 * 60 * 60,
			// domain: "eform.tkproject.eu" 
		}
	}));
}
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

app.use(express.static(path.join(__dirname, "public")));
app.use('/data', express.static(dataDir));
app.use('/photos', express.static(photoPath));

console.log('→ dataDir =', dataDir);



app.use((req, res, next) => {
	res.locals.locale = req.getLocale();
	next();
});
app.use('/user', userRoutes);
app.use('/', mainRoutes);
app.use('/orders', ordersRoutes);
app.use('/position', positionsRoutes);


app.all('*', (req, res) => {
	const status = 404;
	const message = "Page not found.";
	const attemptedPath = req.originalUrl;
	res.status(status).render('error.njk', {
		status,
		message,
		attemptedPath
	});
});

app.use((err, req, res, next) => {
	console.error(err);
	const status = err.status || 500;
	const message = err.message || "Serwer error.";
	const attemptedPath = req.originalUrl; 

	res.status(status).render('error.njk', {
		status,
		message,
		attemptedPath
	});
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
	console.log(`Server działa na porcie ${PORT}`)
);

module.exports = {
	app,
	env,
	i18n
};