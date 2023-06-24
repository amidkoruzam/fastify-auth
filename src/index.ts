import fastify from "fastify";
import { createClient } from "redis";
import { sessionPlugin } from "./session-plugin.js";
import dotenv from "dotenv";

dotenv.config();

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

const server = fastify({ logger: true });

server.register(sessionPlugin, { redisClient });

server.get("/", async (request, reply) => {
  console.log(request.session);
  return { hello: "world" };
});

const start = async () => {
  try {
    await server.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
