import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLSchema,
  GraphQLString,
  GraphQLList
} from 'graphql/type';

import co from 'co';
import User from './user';

/**
 * generate projection object for mongoose
 * @param  {Object} fieldASTs
 * @return {Project}
 */
function getProjection (fieldASTs) {
  return fieldASTs.selectionSet.selections.reduce((projections, selection) => {
    projections[selection.name.value] = 1;

    return projections;
  }, {});
}

var userType = new GraphQLObjectType({
  name: 'User', // Every attribute gets a description along with what the attribute does
  description: 'User creator',
  fields: () => ({ //  Fields of the obejct
    id: {
      type: new GraphQLNonNull(GraphQLString), // ID can not be null and is of type string
      description: 'The id of the user.',
    },
    name: {
      type: GraphQLString,
      description: 'The name of the user.',
    },
    friends: {
      type: new GraphQLList(userType), // Friends are an array of user objects
      description: 'The friends of the user, or an empty list if they have none.',
      resolve: (user, params, source, fieldASTs) => { // Obj, Args, Context, Info
        var projections = getProjection(fieldASTs); // Projection is a filter of attributes from db
        return User.find({
          _id: { // Resolvers are to return data wanted for the query
            // to make it easily testable
            $in: user.friends.map((id) => id.toString()) // Get all friends for a user
          }
        }, projections);
      },
    }
  })
});

var schema = new GraphQLSchema({ // An example of a graph ql schema
  query: new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
      hello: { // The field hello is a string and should return hello world
        type: GraphQLString,
        resolve: function() {
          return 'Hello World';
        }
      },
      user: {
        type: userType, // Making this user attribute in the database a user type object
        args: { // As we discussed before we fields can have arguments
          id: {
            name: 'id',
            type: new GraphQLNonNull(GraphQLString)
          }
        },

        resolve: (root, {id}, source, fieldASTs) => {
          var projections = getProjection(fieldASTs);
          return User.findById(id, projections); // Find the user by the argument passed in
        }
      }
    }
  }),

  // mutation
  mutation: new GraphQLObjectType({
    name: 'Mutation', // Mutation to alter or insert data in database
    fields: {
      createUser: {
        type: userType,
        args: {
          name: {
            name: 'name',
            type: GraphQLString
          }
        },
        resolve: (obj, {name}, source, fieldASTs) => co(function *() {
          var projections = getProjection(fieldASTs);

          var user = new User();
          user.name = name;


          return yield user.save();
        })
      },
      deleteUser: {
        type: userType,
        args: {
          id: {
            name: 'id',
            type: new GraphQLNonNull(GraphQLString)
          }
        },
        resolve: (obj, {id}, source, fieldASTs) => co(function *() {
          var projections = getProjection(fieldASTs);
          console.log(id);
          return yield User.findOneAndRemove({_id: id});
        })
      },
      updateUser: {
        type: userType,
        args: {
          id: {
            name: 'id',
            type: new GraphQLNonNull(GraphQLString)
          },
          name: {
            name: 'name',
            type: GraphQLString
          }
        },
        resolve: (obj, {id, name}, source, fieldASTs) => co(function *() {
          var projections = getProjection(fieldASTs);

          yield User.update({
            _id: id
          }, {
            $set: {
              name: name
            }
          });

          return yield User.findById(id, projections);
        })
      }
    }
  })
});

export var getProjection;
export default schema;
