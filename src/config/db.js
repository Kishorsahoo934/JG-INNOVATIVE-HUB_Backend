import mongoose from "mongoose";

// Some Windows networks permit DNS lookups through the OS resolver but refuse
// Node's SRV DNS requests. Atlas's normal mongodb+srv URI then fails before it
// ever reaches MongoDB. These are the standard seed hosts for this cluster,
// used only as a local fallback for that DNS error.
const ATLAS_SRV_HOST = 'cluster0.iaxllps.mongodb.net';
const ATLAS_SEED_HOSTS = [
  'ac-rba0ut6-shard-00-00.iaxllps.mongodb.net:27017',
  'ac-rba0ut6-shard-00-01.iaxllps.mongodb.net:27017',
  'ac-rba0ut6-shard-00-02.iaxllps.mongodb.net:27017',
].join(',');
const ATLAS_REPLICA_SET = 'atlas-3gkoqj-shard-0';

const getDirectAtlasUri = (uri) => {
  if (!uri?.startsWith('mongodb+srv://') || !uri.includes(ATLAS_SRV_HOST)) return null;

  const directUri = uri
    .replace('mongodb+srv://', 'mongodb://')
    .replace(ATLAS_SRV_HOST, ATLAS_SEED_HOSTS);
  const separator = directUri.includes('?') ? '&' : '?';
  return `${directUri}${separator}authSource=admin&replicaSet=${ATLAS_REPLICA_SET}&tls=true`;
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (error) {
    const directAtlasUri = error?.code === 'ECONNREFUSED' && error?.syscall === 'querySrv'
      ? getDirectAtlasUri(process.env.MONGODB_URI)
      : null;

    if (directAtlasUri) {
      try {
        console.warn('Atlas SRV DNS lookup was refused; using the Atlas seed-host fallback.');
        await mongoose.connect(directAtlasUri);
        console.log('MongoDB connected (Atlas seed-host fallback)');
        return;
      } catch (directError) {
        console.error(directError.message);
        process.exit(1);
      }
    }

    console.error(error.message);
    process.exit(1);
  }
};

export default connectDB;
