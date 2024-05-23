const fs = require('fs-extra');
const upload = require('../../config/multerUserConfig');
const User = require('../auth/models/User');
const Subscription = require('../subscription/Subscription');
const jwt = require('jsonwebtoken')
const {jwtOptions} = require('../auth/passport');
const Role = require('../auth/models/Role');
const { Sequelize, Op } = require('sequelize');


const updatePhoto = async (req, res) => {
    const user = await User.findByPk(req.user.id);
    if(user.photoUrl && user.photoUrl.length>0){
        try {
            await fs.unlinkSync('media/' + req.user.photoUrl);
          } catch (error) {
            console.error('Ошибка при удалении старой аватарки:', error);
          }
    } 
    if(req.file){
        await User.update({
            photoUrl: `avatars/${req.file.filename}`,
        },
        {
            where: {
                id: req.user.id
            }
        });
        res.status(200).end()
    } else {
        res.status(400).send({message: 'Не загружена фотография'})
    }
    
};

const editUser = async(req, res) => {
    const user = await User.findByPk(req.user.id)
    await User.update({
        fullname: req.body.fullname,
        biography: req.body.biography,
        gender: req.body.gender,
    },
    {
        where: {id: req.user.id}
    })
    if(req.body.login != user.login){
        await User.update({
            login: req.body.login
        },
        {
            where: {id: req.user.id}
        })
    }
    const role = await Role.findOne({where: {name: 'user'}})
    const user1 = await User.findByPk(req.user.id)
    const token = jwt.sign({
        id: user1.id,
        email: user1.email,
        fullname: user1.fullname,
        login: user1.login,
        gender: user1.gender,
        biography: user1.biography,
        role: {
            id: role.id,
            name: role.name
        },
        photoUrl: user1.photoUrl
    }, jwtOptions.secretOrKey, {
        expiresIn: 24*60*60*365
    });
    res.status(200).send({token});
}

const editEmail = async(req, res) => {
    const user = await User.findByPk(req.user.id)
    if(req.body.email && req.body.email != user.email){
        await User.update({
            email: req.body.email,
            active: false,
        },
        {
            where: {id: req.user.id}
        })
        res.status(200).send({message: 'На вашу почту было выслано письмо с верификацией'})
    } else { 
        res.status(400).end()
    }
}

const getUser = async(req, res) => {
    if(req.params.username && req.params.username.length > 0){
        const user = await User.findOne({where: {login: req.params.username}})
        if(user?.dataValues?.password){
            delete user.dataValues.password;
        }
        if(user){
            res.status(200).send(user);
        } else {
        res.status(400).send({message: 'Такого пользователя не существует!'})
        }
    }

}
const getUserById = async(req, res) => {
    if(req.params.id && req.params.id.length > 0){
        const user = await User.findOne({where: {id: req.params.id}})
        if(user){
            res.status(200).send(user);
        } else {
        res.status(400).send({message: 'Такого пользователя не существует!'})
        }
    }
}
const getInfoAboutMe = async(req, res) => {
    if(req.user){
        res.status(200).send(req.user);
    } else {
    res.status(400).send({message: 'Вы не авторизованы!'})
    }
}
const getUserList = async (req, res) => {
    if(req.body.query.length > 0){
        const users = await User.findAll({
            where: {
            [Sequelize.Op.or]: [
                { login: { [Sequelize.Op.iLike]: `%${req.body.query}%` } },
                { fullname: { [Sequelize.Op.iLike]: `%${req.body.query}%` } },
            ],
            },
        });
        res.status(200).send(users);
    } else {
        res.status(200).send([]);
    }
};
const getSuggestions = async(req, res) => {
    const profiles = await Subscription.findAll({
        where: {
            followerId: req.user.id,
        }
    })
    let users = await User.findAll({
        where: {
          active: true,
        },
    });
    let suggestions = [];
    for(let user of users){
        let isFound = false;
        for(let profile of profiles){
            if(user.id == profile.profileId){
                isFound = true;
                break;
            }
        }
        if(!isFound){
            user.dataValues.isFollowing = false;
            suggestions.push(user);
        }
    }
    if(suggestions){
        res.status(200).send(suggestions);
    } else {
        res.status(500).send([])
    }
}
module.exports = { 
    updatePhoto,
    editUser,
    editEmail,
    getUser,
    getInfoAboutMe,
    getUserById,
    getUserList,
    getSuggestions,
};