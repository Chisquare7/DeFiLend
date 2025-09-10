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
      <div className="bg-white shadow-md rounded-2xl p-6 grid gap-2">
        <h2 className="text-xl font-bold mb-2">User Dashboard</h2>
        <p>User's Collateral: {formatEther(userCollateral ?? BigInt(0))}</p>
        <p>User's Loan: {formatEther(userLoan ?? BigInt(0))}</p>
        <p>User's CLT Balance: {formatEther(userCLT ?? BigInt(0))}</p>
        <p>User's BFI Balance: {formatEther(userBFI ?? BigInt(0))}</p>
        <p>LTC of user: {Number(userLTC ?? 0)}</p>
        <p>
          Health Status:{" "}
          <span
            className={`px-2 py-1 rounded-md text-white ${
              isHealthy ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {isHealthy ? "Healthy" : "Unhealthy"}
          </span>
        </p>
        <p>
          Check Health (Simulated):{" "}
          <span
            className={`font-bold ${
              checkHealthy ? "text-green-600" : "text-red-600"
            }`}
          >
            {checkHealthy ? "Healthy" : "Unhealthy"}
          </span>
        </p>
      </div>
      <div className="bg-white rounded-2xl shadow p-6 grid gap-2">
        <h2 className="text-xl font-bold text-gray-800">Protocol Stats</h2>
        <p>
          Available Borrow Token: {formatEther(availableBorrow ?? BigInt(0))}
        </p>
        <p>Residual Collateral: {formatEther(availableCLT ?? BigInt(0))}</p>
        <p>Total Borrowed: {formatEther(totalBorrowed ?? BigInt(0))}</p>
        <p>Total Collateral: {formatEther(totalCollateral ?? BigInt(0))}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
