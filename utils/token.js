import jwt from "jsonwebtoken";

const genToken = async (userid) => {
    try {
        const token = await jwt.sign({ userid }, process.env.JWT_SECRET, { expiresIn: "1d" });
        return token;
    } catch (error) {
        console.log(error);
    }
}

export default genToken;