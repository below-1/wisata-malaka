import mongoose from 'mongoose';
import fp from 'fastify-plugin'

const mongo_uri = process.env.MONGO_URI
if (!mongo_uri) {
  throw new Error('mongo_uri is not defined')
}

export default fp(async (fastify) => {
  try {
    await mongoose.connect(mongo_uri, { useNewUrlParser: true, useUnifiedTopology: true },)
    fastify.decorate('get_mongo_client', mongoose.connection.getClient())
    console.log(`done connecting to mongo`)
  } catch (err) {
    console.log('fail connecting to mongo');
    throw err;
  }
})
