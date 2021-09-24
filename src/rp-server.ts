import express from 'express';
import createError from 'http-errors';
import { Issuer } from 'openid-client';
import expressSession from 'express-session';
import passport from 'passport';
import { ap, sessionSecret, config } from '../config';

import { OpenIDConnectStrategy } from './strategy';

export const DEFAULT_PORT = 3100;

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

export class ServerExpress {
  static mounted: { [named: string]: string } = {};
  listener: import('http').Server;

  async start(port = DEFAULT_PORT) {
    const params = { scope: ['openid'] };
    const app = express();

    const issuer = await Issuer.discover(ap);
    const client = new issuer.Client(config);
    app.use(
      expressSession({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: true,
      })
    );
    app.use(passport.initialize());
    app.use(passport.session());
    passport.use(
      'oidc',
      new OpenIDConnectStrategy({ client, params }, (tokenSet, userinfo, done) => {
        return done(null, tokenSet.claims());
      })
    );
    app.get('/', (req, res) => res.send(`<title>Login</title><form action="/auth"> <input type="submit" value="Login"> </form>`));
    app.get('/auth', (req, res, next) => {
      passport.authenticate('oidc', {
        /*acr_values: ...*/
      })(req, res, next);
    });
    app.get('/auth/callback', (req, res, next) => {
      passport.authenticate('oidc', {
        successRedirect: '/success',
        failureRedirect: '/error',
      })(req, res, next);
    });

    app.get('/success', (req, res) => res.send('<title>success - logout</title>Success<br /><form action="/logout"><input type="submit" value="Logout"></form>'));
    app.get('/error', (req, res) => res.send('error'));
    app.get('/logout', (req, res) => {
      res.redirect(client.endSessionUrl({ client_id: config.client_id }));
    });
    app.get('/logout/callback', (req, res) => {
      (req as any).logout();
      res.redirect('/');
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
      res.render('error');
    });

    this.listener = await app.listen(port, () => console.log(`Server listening on port: ${port}`));
  }
}

new ServerExpress().start();
