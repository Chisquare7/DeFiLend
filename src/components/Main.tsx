import { useAccount, useReadContract, useWriteContract } from "wagmi";
import contracts from "../contracts";
import { formatEther, parseEther, zeroAddress } from "viem";
import { useState } from "react";

const Main = () => {
  const [cltInput, setCltInput] = useState("");
  const { address: connectedAccount } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [borrowInput, setBorrowInput] = useState("");
  const [repayInput, setRepayInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");

  const { data: totalBorrowed } = useReadContract({
    ...contracts.borrowFi,
    functionName: "totalBorrowed",
  });
  const { data: totalCollateral } = useReadContract({
    ...contracts.borrowFi,
    functionName: "totalCollateral",
  });
  const { data: userCollateral } = useReadContract({
    ...contracts.borrowFi,
    functionName: "collateralOf",
    args: [connectedAccount ?? zeroAddress],
  });

  const { data: userLoan } = useReadContract({
    ...contracts.borrowFi,
    functionName: "loanOf",
    args: [connectedAccount ?? zeroAddress],
  });
  const { data: userLTC } = useReadContract({
    ...contracts.borrowFi,
    functionName: "getLTC",
  });

  const { data: isHealthy } = useReadContract({
    ...contracts.borrowFi,
    functionName: "isHealthy",
  });

  const { data: userCLT } = useReadContract({
    ...contracts.cltToken,
    functionName: "balanceOf",
    args: [connectedAccount ?? zeroAddress],
  });

  const { data: userBFI } = useReadContract({
    ...contracts.borrowToken,
    functionName: "balanceOf",
    args: [connectedAccount ?? zeroAddress],
  });

  const { data: availableBorrow } = useReadContract({
    ...contracts.borrowToken,
    functionName: "balanceOf",
    args: [contracts.borrowFi.address],
  });
  const { data: availableCLT } = useReadContract({
    ...contracts.cltToken,
    functionName: "balanceOf",
    args: [contracts.borrowFi.address],
  });

  const { data: cltAllowance } = useReadContract({
    ...contracts.cltToken,
    functionName: "allowance",
    args: [connectedAccount ?? zeroAddress, contracts.borrowFi.address],
  });

  // checkIfHealthy function logic
  const checkIfHealthy = (loanValue: bigint, collateralValue: bigint) => {
    const DECIMALS = 10000n;
    if (collateralValue === 0n) return false;
    const ratio = (loanValue * DECIMALS) / collateralValue;
    return ratio >= 7000n;
  };

  const checkHealthy = checkIfHealthy(userLoan ?? 0n, userCollateral ?? 0n);

  const addCLT = async () => {
    const parsedAmount = parseEther(cltInput);
    const _addClt = async () => {
      if (userCLT && userCLT >= parsedAmount) {
        const txHash = await writeContractAsync({
          ...contracts.borrowFi,
          functionName: "addCollateral",
          args: [parsedAmount],
        });
        if (txHash) {
          alert("Add Collateral Successful!");
        } else {
          throw new Error("Add Collateral failed!");
        }
      } else {
        throw new Error("Insufficient CLT");
      }
    };

    try {
      if (parsedAmount > (cltAllowance ?? BigInt(0n))) {
        const txHash = await writeContractAsync({
          ...contracts.cltToken,
          functionName: "approve",
          args: [contracts.borrowFi.address, parsedAmount],
        });

        if (txHash) {
          await _addClt();
        }
      } else {
        await _addClt();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Borrow function logic
  const borrowBFI = async () => {
    try {
      const parsedAmount = parseEther(borrowInput);
      const txHash = await writeContractAsync({
        ...contracts.borrowFi,
        functionName: "borrow",
        args: [parsedAmount],
      });
      if (txHash) alert("Borrow Successful!");
    } catch (err) {
      console.error(err);
    }
  };

  // Repay function logic
  const repayBFI = async () => {
    try {
      const parsedAmount = parseEther(repayInput);

      const allowance = await useReadContract({
        ...contracts.borrowToken,
        functionName: "allowance",
        args: [connectedAccount ?? zeroAddress, contracts.borrowFi.address],
      });

      if (parsedAmount > (allowance?.data ?? BigInt(0))) {
        const approveTx = await writeContractAsync({
          ...contracts.borrowToken,
          functionName: "approve",
          args: [contracts.borrowFi.address, parsedAmount],
        });
        if (!approveTx) throw new Error("Approval failed");
      }

      const txHash = await writeContractAsync({
        ...contracts.borrowFi,
        functionName: "repay",
        args: [parsedAmount],
      });
      if (txHash) alert("Repay Successful!");
    } catch (err) {
      console.error(err);
    }
  };

  // Withdraw Collateral function logic
  const withdrawCLT = async () => {
    try {
      const parsedAmount = parseEther(withdrawInput);
      const txHash = await writeContractAsync({
        ...contracts.borrowFi,
        functionName: "withdrawCollateral",
        args: [parsedAmount],
      });
      if (txHash) alert("Withdraw Collateral Successful!");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="px-8 py-6 grid gap-8 max-w-4xl mx-auto">
      <div className="bg-white shadow-lg rounded-2xl p-6 grid gap-4 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></span>
          User Dashboard
        </h2>

        <div className="space-y-2 text-gray-700">
          <p>
            <span className="font-semibold">User's Collateral:</span>{" "}
            {formatEther(userCollateral ?? BigInt(0))}
          </p>
          <p>
            <span className="font-semibold">User's Loan:</span>{" "}
            {formatEther(userLoan ?? BigInt(0))}
          </p>
          <p>
            <span className="font-semibold">User's CLT Balance:</span>{" "}
            {formatEther(userCLT ?? BigInt(0))}
          </p>
          <p>
            <span className="font-semibold">User's BFI Balance:</span>{" "}
            {formatEther(userBFI ?? BigInt(0))}
          </p>
          <p>
            <span className="font-semibold">LTC of user:</span>{" "}
            {Number(userLTC ?? 0)}
          </p>
        </div>

        {/* Health Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="font-semibold text-gray-700">Health Status:</span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold shadow-sm ${
              isHealthy
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            {isHealthy ? "Healthy" : "Unhealthy"}
          </span>
        </div>

        {/* Simulated Check */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="font-semibold text-gray-700">
            Check Health (Simulated):
          </span>
          <span
            className={`font-bold ${
              checkHealthy ? "text-green-600" : "text-red-600"
            }`}
          >
            {checkHealthy ? "Healthy" : "Unhealthy"}
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-2xl shadow-lg p-6 grid gap-4 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
          Protocol Stats
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-start hover:shadow-md transition">
            <p className="text-sm text-gray-500">Available Borrow</p>
            <p className="text-lg font-semibold text-blue-600">
              {formatEther(availableBorrow ?? 0n)}{" "}
              <span className="text-xs">BFI</span>
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-start hover:shadow-md transition">
            <p className="text-sm text-gray-500">Available Collateral</p>
            <p className="text-lg font-semibold text-green-600">
              {formatEther(availableCLT ?? 0n)}{" "}
              <span className="text-xs">CLT</span>
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-start hover:shadow-md transition">
            <p className="text-sm text-gray-500">Total Borrowed</p>
            <p className="text-lg font-semibold text-red-600">
              {formatEther(totalBorrowed ?? 0n)}{" "}
              <span className="text-xs">BFI</span>
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-start hover:shadow-md transition">
            <p className="text-sm text-gray-500">Total Collateral</p>
            <p className="text-lg font-semibold text-purple-600">
              {formatEther(totalCollateral ?? 0n)}{" "}
              <span className="text-xs">CLT</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Borrow UI */}
        <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-4">
          <input
            className="border rounded-lg p-2 flex-1"
            type="number"
            placeholder="Amount BFI"
            value={borrowInput}
            onChange={(e) => setBorrowInput(e.target.value)}
          />
          <button
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
            onClick={borrowBFI}
          >
            Borrow
          </button>
        </div>

        {/* Repay UI */}
        <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-4">
          <input
            className="border rounded-lg p-2 flex-1"
            type="number"
            placeholder="Amount BFI"
            value={repayInput}
            onChange={(e) => setRepayInput(e.target.value)}
          />
          <button
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
            onClick={repayBFI}
          >
            Repay
          </button>
        </div>

        {/* Add Collateral UI */}
        <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-4">
          <input
            className="border rounded-lg p-2 flex-1"
            type="number"
            placeholder="Amount CLT"
            value={cltInput}
            onChange={(e) => setCltInput(e.target.value)}
          />
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            onClick={addCLT}
          >
            Add Collateral
          </button>
        </div>

        {/* Withdraw Collateral UI */}
        <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-4">
          <input
            className="border rounded-lg p-2 flex-1"
            type="number"
            placeholder="Amount CLT"
            value={withdrawInput}
            onChange={(e) => setWithdrawInput(e.target.value)}
          />
          <button
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
            onClick={withdrawCLT}
          >
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
};

export default Main;
