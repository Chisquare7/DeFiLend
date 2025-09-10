import { ConnectButton } from "@rainbow-me/rainbowkit";

const Header = () => {
  return (
    <div className="py-4 px-12 flex items-center justify-between bg-white shadow-md">
      <h1 className="text-2xl font-extrabold tracking-wide bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
        DeFILend
      </h1>
      <ConnectButton />
    </div>
  );
};

export default Header;
