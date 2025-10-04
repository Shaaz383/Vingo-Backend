import jwt from "jsonwebtoken";

const isAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    if (!decodedToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log(decodedToken);
    req.userId = decodedToken.userid;
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default isAuth;
