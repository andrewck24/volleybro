import VerificationToken from "@/infrastructure/db/mongoose/schemas/verification-token";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";

export const getVerificationTokenByToken = async (token) => {
  try {
    await connectToMongoDB();
    const verificationToken = await VerificationToken.findById({ _id: token });
    return verificationToken;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getVerificationTokenByEmail = async (email) => {
  try {
    await connectToMongoDB();
    const verificationToken = await VerificationToken.findOne({ email });
    return verificationToken;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const createVerificationToken = async (
  email,
  identifier = "sign-up",
) => {
  try {
    let verificationToken;

    await connectToMongoDB();
    const isTokenExisted = await VerificationToken.findOne({ email });
    const token = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");

    if (isTokenExisted) {
      verificationToken = {
        ...isTokenExisted,
        expires: new Date(Date.now() + 60 * 60 * 1000),
        token,
        identifier,
      };
    } else {
      verificationToken = new VerificationToken({
        email,
        expires: new Date(Date.now() + 60 * 60 * 1000),
        token,
        identifier,
      });
    }
    await verificationToken.save();
    return verificationToken;
  } catch (error) {
    console.error(error);
    return null;
  }
};
