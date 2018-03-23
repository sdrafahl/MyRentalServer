let assert = require('assert');
let MockExpress = require('mock-express');
let mysql = require("mysql");
let fs = require('fs');
let bcrypt = require('bcryptjs');
let exec = require('child_process').exec;
let crypto = require('crypto');
let faker = require('faker');
let Log = require('../modules/Log.js');

let DataBase = require('../modules/database.js');
let User = require('../models/UsersRequests.js').UserTest;
let Request = require('../models/UsersRequests.js').RequestTest;
let config = require('../config.json');

let testUserRequest = generateFakeUserRequest();
let testServiceRequest = generateFakeServiceRequest();
let database = new DataBase("test");
let logger = new Log();

describe('Database Module Test', () => {
  beforeEach((done) => {
      exec("knex migrate:rollback --env testing", (err, stdout, stderr) => {
          exec("knex migrate:latest --env testing", (err, stdout, stderr) => {
              done();
          });
      });
  });

  describe('userController', () => {

    describe('post -> /create', () => {
      it('A user should be created', (done) => {
          database.registerUser(testUserRequest, (callBack) => {
              User.where('NAME', testUserRequest.body.username)
              .fetch()
              .then(function(user) {
                  assert.equal(user.get('NAME'), testUserRequest.body.username);
                  assert.equal(user.get('CITY'), testUserRequest.body.city);
                  assert.equal(callBack.success, true);
                  done();
              })
              .catch((err) => {
                 assert(false);
                 done();
              });
          });
      });
    });

    describe('post -> /login', () => {
        it('A user should be created and also be able to login', (done) => {
            database.registerUser(testUserRequest, (callBack) => {
                database.login(testUserRequest, (callBack) => {
                    assert.equal(callBack.success, true);
                    done();
                });
            });
        });
    });
  });
});

describe('requestController', () => {

    describe('post -> /handleRequest', () => {
        it('A request should be saved and associated to a user', (done) => {
            database.registerUser(testUserRequest, (callBack) => {
                database.handleRequest(testServiceRequest, (callBack) => {
                    User.where('id', 1).fetch ({
                        'withRelated': ['requests']
                    }).then((user) => {
                        let request = user.related('requests').toJSON();
                        let jsonRequest = JSON.parse(request[0].JSON_REQUEST);
                        assert.equal(jsonRequest.lawnCare.height, testServiceRequest.body.serviceRequest.lawnCare.height);
                        done();
                    })
                    .catch((err) => {
                       console.log(err);
                       assert(false);
                       done();
                    });
                });
            });
        });
    });
});

function generateFakeUserRequest() {
    let fakePass = faker.internet.password();
    return {
        'body': {
            'password': encrypt(fakePass),
            'email': faker.internet.email(),
            'username': faker.internet.userName(),
            'address': faker.address.streetAddress(),
            'state': faker.address.state(),
            'zip': faker.address.zipCode(),
            'city': faker.address.city(),
        },
        'session': {
            'loggedIn': false,
        },
        'realPass': fakePass,
    };
}

function generateFakeServiceRequest() {
    return {
        'body': {
            'serviceRequest': {
                'lawnCare': {
                    'height': faker.random.number(),
                    'pattern': "stripe",
                    'fertilize': false,
                    'water': false,
                    'seeds': false,
                    'removeWeeds': false,
                    'misc': "",
                }
            },
            'address': faker.address.streetAddress(),
            'state': faker.address.state(),
            'zip': faker.address.zipCode(),
            'city': faker.address.city(),
        },
        'session': {
            'loggedIn': true,
            'userId': 1,
        },
    }
}

function encrypt(password) {
    let cipher = crypto.createCipher(config.client_side_encryption.algorithm,
            config.client_side_encryption.password);
    let crypted = cipher.update(password, 'utf-8', 'hex');
        crypted += cipher.final('hex');
        return crypted;
}
