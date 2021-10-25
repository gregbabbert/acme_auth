require('dotenv').config();
const Sequelize = require('sequelize');
const { STRING } = Sequelize;
const config = {
    logging: false
};

const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt');

if (process.env.LOGGING) {
    delete config.logging;
}
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost/acme_db', config);

const User = conn.define('user', {
    username: STRING,
    password: STRING
});

const Note = conn.define('note', {
    text: STRING,
})

User.hasMany(Note);
Note.belongsTo(User);

User.byToken = async (token) => {
    try {
        const payload = await jwt.verify(token, process.env.JWT)
        if (payload) {
            const user = await User.findByPk(payload.id);
            return user;
        }
        const error = Error('bad credentials');
        error.status = 401;
        throw error;
    }
    catch (ex) {
        const error = Error('bad credentials');
        error.status = 401;
        throw error;
    }
};

User.prototype.generateToken = async function () {
    try {
        const token = await jwt.sign({ id: this.id }, process.env.JWT);
        return { token };
    } catch (err) {
        console.log(err)
    }
}

User.authenticate = async ({ username, password }) => {
    let hashedPassword = await User.findOne({ where: { username } })
    hashedPassword = hashedPassword.toJSON();
    if (await bcrypt.compare(password, hashedPassword.password)) {
        const user = await User.findOne({
            where: {
                username,
            }
        });
        if (user) {
            return user;
        }
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
};

const syncAndSeed = async () => {
    await conn.sync({ force: true });
    const credentials = [
        { username: 'lucy', password: 'lucy_pw' },
        { username: 'moe', password: 'moe_pw' },
        { username: 'larry', password: 'larry_pw' }
    ];
    const [lucy, moe, larry] = await Promise.all(
        credentials.map(credential => User.create({
            username: credential.username,
            password: bcrypt.hashSync(credential.password, 10)
        }))
    );
    const notes = [{ text: 'hello world' }, { text: 'reminder to buy groceries' }, { text: 'reminder to do laundry' }];
    const [note1, note2, note3] = await Promise.all(notes.map(note => Note.create(note)));
    await lucy.setNotes(note1);
    await moe.setNotes([note2, note3]);
    return {
        users: {
            lucy,
            moe,
            larry
        }
    };
};

module.exports = {
    syncAndSeed,
    models: {
        User,
        Note
    }
};