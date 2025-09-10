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
    <div className="px-8 grid gap-4">
      <div>
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
      <div>
        <p>
          Available Borrow Token: {formatEther(availableBorrow ?? BigInt(0))}
        </p>
        <p>Residual Collateral: {formatEther(availableCLT ?? BigInt(0))}</p>
        <p>Total Borrowed: {formatEther(totalBorrowed ?? BigInt(0))}</p>
        <p>Total Collateral: {formatEther(totalCollateral ?? BigInt(0))}</p>
      </div>

      {/* Add Collateral UI */}
      <div className="flex items-center gap-4">
        <p>Add Collateral</p>
        <input
          className="border-1"
          type={"number"}
          value={cltInput}
          onChange={(e) => setCltInput(e.target.value)}
        />
        <button className="bg-blue-400 px-2 py-1 rounded-sm" onClick={addCLT}>
          Add
        </button>
      </div>

      {/* Borrow UI */}
      <div className="flex items-center gap-4">
        <p>Borrow BFI</p>
        <input
          className="border-1"
          type={"number"}
          value={borrowInput}
          onChange={(e) => setBorrowInput(e.target.value)}
        />
        <button
          className="bg-green-400 px-2 py-1 rounded-sm"
          onClick={borrowBFI}
        >
          Borrow
        </button>
      </div>

      {/* Repay UI */}
      <div className="flex items-center gap-4">
        <p>Repay Loan</p>
        <input
          className="border-1"
          type={"number"}
          value={repayInput}
          onChange={(e) => setRepayInput(e.target.value)}
        />
        <button
          className="bg-yellow-400 px-2 py-1 rounded-sm"
          onClick={repayBFI}
        >
          Repay
        </button>
      </div>

      {/* Withdraw Collateral UI */}
      <div className="flex items-center gap-4">
        <p>Withdraw Collateral</p>
        <input
          className="border-1"
          type={"number"}
          value={withdrawInput}
          onChange={(e) => setWithdrawInput(e.target.value)}
        />
        <button
          className="bg-red-400 px-2 py-1 rounded-sm"
          onClick={withdrawCLT}
        >
          Withdraw
        </button>
      </div>
    </div>
  );
};

export default Main;
