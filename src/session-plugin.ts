import { nanoid } from "nanoid";
import cookie from "cookie";
import { FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";
import { createClient } from "redis";

type Session = {
  userId: string | null;
  id: string;
};

declare module "fastify" {
  export interface FastifyRequest {
    session: Session;
  }
}

const defaultSession: Session = { userId: null, id: "" };

const plugin: FastifyPluginCallback<{
  redisClient: ReturnType<typeof createClient>;
}> = (api, { redisClient }, cb) => {
  api.addHook("onRequest", async (request, reply) => {
    const c = request.headers.cookie;
    const parsed = cookie.parse(c ?? "");
    const token = parsed["session-id"] ?? nanoid();

    if (!parsed.token) {
      await redisClient.set(
        token,
        JSON.stringify({ ...defaultSession, id: token })
      );
    }

    reply.header(
      "set-cookie",
      cookie.serialize("session-id", token, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      })
    );

    const session = await redisClient.get(token);

    if (session) {
      request.session = JSON.parse(session);
    }
  });

  api.addHook("onResponse", async (request) => {
    const session = request.session;
    await redisClient.set(session.id, JSON.stringify(session));
  });

  cb();
};

export const sessionPlugin = fp(plugin);
