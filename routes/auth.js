const bcrypt = require("bcrypt");
const { z } = require("zod");
const crypto = require("crypto");

const registerSchema = z.object({
  name: z.string().min(4, "Name must be at least 4 characters"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  dob: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "invalid date format",
  }),
});

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

function verification_token() {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return { verificationToken, tokenExpiresAt };
}

module.exports = async function (app, opts) {
  app.post("/signup", async (req, reply) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      reply.badRequest("Validations Error", result.error.format())
    }

    const { email, password, name, dob } = result.data;

    try {
      const existingUser = await app.pg.query(
        "SELECT id FROM hkai_users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        return reply.conflict("Email already taken");
      }

      const hashedPassword = await hashPassword(password);
      const { tokenExpiresAt, verificationToken } = verification_token();

      // create new user row
      const { rows } = await app.pg.query(
        `INSERT INTO hkai_users 
        (name, email, password_hash, dob, verification_token, verification_token_expires_at) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING id, name, email, role, acc_status, avatar, bio`,
        [name, email, hashedPassword, dob, verificationToken, tokenExpiresAt]
      );

      const newUser = rows[0];

      // 4. Generate Token & Login
      const token = app.jwt.sign({
        id: newUser.id,
        role: newUser.role,
        acc_status: newUser.acc_status,
      });

      // Send Email (Async)
      console.log(
        `Sending verification email to ${email} with token ${verificationToken}`
      );

      reply
        .setCookie("access_token", token, {
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "None",
          maxAge: 60 * 60 * 24,
        })
        .created(newUser, "Registration successful");
    } catch (error) {
      app.log.error(error);
      reply.serverError();
    }
  });

  app.post("/login", async (req, reply) => {
    console.log("logging user in");
    const { email, password } = req.body;

    try {
      const { rows } = await app.pg.query(
        "SELECT * FROM hkai_users WHERE email = $1",
        [email]
      );

      const user = rows[0];

      if (!user) {
        return reply.unauthorized("Invalid email or password");
      }

      // verify password
      const isPasswordCorrect = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!isPasswordCorrect) {
        return reply.unauthorized("Invalid email or password");
      }

      const token = app.jwt.sign({
        id: user.id,
        role: user.role,
        acc_status: user.acc_status,
      });

      // 3. Send it as a Cookie
      reply
        .setCookie("hkai_access_token", token, {
          path: "/",
          httpOnly: true,
          secure: process.env.PROD || false,
          sameSite: "Lax",
          maxAge: 60 * 60 * 24,
        })
        .success(
          {
            id: user.id,
            name: user.name,
            email: user.email,
            bio: user.bio,
            avatar: user.avatar,
            role: user.role,
            acc_status: user.acc_status,
          },
          "Logged in successfully"
        );
    } catch (error) {
      app.log.error(error);
      reply.serverError();
    }
  });

  app.get("/auth", { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!req.user) {
      return reply.unauthorized("You are not Logged In!!");
    }
    const { id } = req.user;

    try {
      const { rows } = await app.pg.query(
        "SELECT * FROM hkai_users WHERE id = $1",
        [id]
      );

      const user = rows[0];

      if (!user) {
        return reply.notFound("User not Found");
      }

      reply.success({
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        role: user.role,
        acc_status: user.acc_status,
      });
    } catch (error) {
      console.log(error.message);
      reply.serverError();
    }
  });

  app.get("/logout", async (req, reply) => {
    reply.setCookie("hkai_access_token", "", {
      path: "/",
      httpOnly: true,
      secure: process.env.PROD || false,
      sameSite: "Lax",
      maxAge: 1,
    }).success();
  });
};
