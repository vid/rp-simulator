import express from 'express';
import createError from 'http-errors';
import { Issuer } from 'openid-client';
import expressSession from 'express-session';
import passport from 'passport';
import { oidc_clients, sessionSecret } from '../config';
import { locales_en, locales_fr } from './locales/translations';

import { OpenIDConnectStrategy } from './strategy';

export const DEFAULT_PORT = 3100;

interface RequestWithUserSession extends express.Request {
  user?: any,
  session?: any
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

export class ServerExpress {
  static mounted: { [named: string]: string } = {};
  listener: import('http').Server;

  async start(port = DEFAULT_PORT) {
    const params = { scope: ['openid'] };
    const app = express();
    app.set('trust proxy', 1) // trust first proxy

    app.use(
      expressSession({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: true,
        cookie: {
          maxAge: 600000
        }
      })
    );
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(express.static(__dirname + '/public'));
    app.set('views', __dirname + '/views');
    app.set("view engine", "ejs");

    setupStrategies();

    app.get('/', (req, res) => res.render('index', {}));

    app.get('/rpsim/:page/:lang', (req: RequestWithUserSession, res) => {
      let template

      switch(req.params.lang) {
        case 'en':
          template = locales_en
          break;
        case 'fr':
          template = locales_fr
          break;
        default:
          return res.redirect('/');
      }

      let data = {
        ...template, 
        'page': req.params.page,
        isLoggedIn: req.user != undefined
      }

      switch(req.params.page) {
        case 'home':
          res.render('home', data)
          break;
        case 'login':
          data = {  
            ...data,
            oidc_clients: oidc_clients.map((item) => { return {name: item.name, description: item.description} })
          }
          res.render('login', data)
          break;
        case 'response':         
          data = {  
            ...data,
            reqParams: req.session.reqParams,
            user: req.user, 
            tokenSet: req.session.tokenSet, 
            userinfo: req.session.userinfo
          }
          res.render('response', data)
          break;
        default:
          res.render('home', data)
      }
    });

    app.get('/auth/:provider', (req: RequestWithUserSession, res, next) => {
      const provider = req.params.provider
      
      passport.authenticate(provider, {
        ...req.query,
      })(req, res, next);
    });

    app.get('/auth/callback/:provider', (req, res, next) => {
      const provider = req.params.provider

      passport.authenticate(provider, {
        successRedirect: `/success/${provider}`,
        failureRedirect: `/error?error=${req.query.error}: ${req.query.error_description}`,
      })(req, res, next); 
    });

    app.get('/success/:provider', (req: RequestWithUserSession, res) => {
      const provider = req.params.provider 
      // save teh current provider in req.session for the logout
      req.session.provider = provider

      res.redirect(`/rpsim/response/${getLocale(req)}`);      
    });

    app.get('/error', (req, res) => res.status(500).render('error', {err: req.query.error}));
    
    app.get('/logout/:locale(en|fr)?', (req: RequestWithUserSession, res) => {
      const provider = req.session.provider

      if ( !provider ) res.status(400).send('No Session')
      else {
        const strategy = passport._strategy(provider)
        const client = strategy._client
        const locale = req.params.locale

        if (locale && req.session) {
          if (!req.session.userinfo) req.session.userinfo = {} 
          req.session.userinfo.locale = locale
        } 

        res.redirect(client.endSessionUrl({ client_id: client.client_id }));
      } 
    });

    app.get('/logout/callback', (req: RequestWithUserSession, res) => {
      const locale = getLocale(req);

      (req as any).logout();
      req.session.destroy((err) => {
        if (err) res.status(500).render('error', {err: err});
        res.redirect(`/rpsim/login/${locale}`);
      }); 
    });

    // invalid routes

    // catch 404 and forward to error handler
    app.use((req, res, next) => next(createError(404)));

    // error handler
    app.use((err, req, res, next) => {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};

      // render the error page
      res.status(err.status || 500);
      res.render('error', {
        err: err.message
      } );
    });

    this.listener = await app.listen(port, () => console.log(`Server listening on port: ${port}`));
  }
}

async function setupStrategies() {
  const params = { scope: ['openid'] };

  for (const cli of oidc_clients) {
    try {
      const issuer = await Issuer.discover(cli.ap);
      const client = new issuer.Client(cli.config);
      passport.use(
        cli.name,
        new OpenIDConnectStrategy({ client, params, passReqToCallback: true }, (req, tokenSet, userinfo, done) => {
          req.session.tokenSet = tokenSet;
          req.session.userinfo = userinfo;

          return done(null, tokenSet.claims());
        })
      );
    } catch (error) {
      console.log(`OPError: ${cli.ap} OIDC client not discovered successfully [Hint: OIDC client offline?].`);
    }
  }
}

function getLocale(req: RequestWithUserSession) {
  const userinfo = req.session && req.session.userinfo
  const reqParams = req.session && req.session.reqParams
  const locale = (userinfo && userinfo.locale ? userinfo.locale.substring(0,2) : (reqParams && reqParams.ui_locales ? reqParams.ui_locales.substring(0,2) : 'undefined'))

  return locale
}

new ServerExpress().start();
