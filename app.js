const express = require('express');
const app = express();
app.use(express.json());
const { models: { User, Note } } = require('./db');
const path = require('path');

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/auth', async (req, res, next) => {
    try {
        const user = await User.authenticate(req.body);
        if (!user) {
            res.sendStatus(404);
        }
        else {
            const token = await user.generateToken();
            res.send(token);
        }
    }
    catch (ex) {
        next(ex);
    }
});

app.get('/api/auth', async (req, res, next) => {
    try {
        console.log(req.headers.authorization)
        res.send(await User.byToken(req.headers.authorization));
    }
    catch (ex) {
        next(ex);
    }
});

app.get('/api/users/:username', async (req, res, next) => {
    try {
        res.send(await User.findOne({
            where: {
                username: req.params.username
            }
        }));
    }
    catch (ex) {
        next(ex);
    }
});

app.get('/api/users/:id/notes', async (req, res, next) => {
    try {
        const notes = await Note.findAll({
            where: {
                userId: req.params.userId
            }
        });
        res.send(notes)
    } catch (err) {

    }
})

app.use((err, req, res, next) => {
    console.log(err);
    res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;