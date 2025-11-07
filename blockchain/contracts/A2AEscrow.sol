// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// This is a NEW concept. We are IMPORTING another contract's "menu".
// This file (IERC20.sol) is a standard "Interface" from OpenZeppelin
// (the package we installed). It's not the full USDC code, just
// a list of its functions (like `transfer` and `transferFrom`).
// This is how our contract knows HOW to talk to the USDC contract.
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title A2AEscrow
 * @dev This is the "Bank Vault". It holds USDC in escrow
 * from a Manager Agent until a job is complete, then pays
 * the Specialist Agent.
 */
contract A2AEscrow {
    
    // --- State Variables (The Contract's "Memory") ---

    // This is a variable that will "point" to the real USDC contract.
    // By making it "public", we can easily check its address.
    IERC20 public usdcToken;

    // This is the blueprint for a "Job".
    // It's the "job ticket" that our vault will track.
    struct Job {
        uint256 id;         // The unique ID for this job
        address manager;    // The wallet of the "Manager" (hirer)
        address specialist; // The wallet of the "Specialist" (worker)
        uint256 amount;     // The payment amount (in USDC)
        bool isFunded;      // Has the Manager deposited the money yet?
        bool isComplete;    // Has the Manager released the payment yet?
    }

    // This is our database of all jobs.
    // It maps a "Job ID" (a number) to its "Job Ticket" (the struct).
    mapping(uint256 => Job) public jobs;

    // A simple counter to make sure every new job gets a unique ID.
    uint256 public nextJobId = 1;

    // --- Events (Blockchain "Logs") ---

    // We "emit" (fire) this event when a job is funded.
    // Our frontend app can "listen" for this log.
    event JobFunded(uint256 jobId, address manager, address specialist, uint256 amount);
    
    // We emit this when the payment is released.
    event PaymentReleased(uint256 jobId);


    // --- Functions (The Contract's "Actions") ---

    /**
     * @dev This is the "Constructor". It runs ONLY ONE TIME,
     * when the contract is first deployed.
     * We use it to tell our contract the *address* of the USDC token.
     */
    constructor(address _usdcTokenAddress) {
        // We set our "usdcToken" variable to point to the real contract.
        usdcToken = IERC20(_usdcTokenAddress);
    }

    /**
     * @dev The Manager Agent calls this to create and fund a job.
     * It returns the new Job's ID.
     */
    function fundJob(address _specialist, uint256 _amount) 
        public 
        returns (uint256) 
    {
        // 1. Get a new ID and increment the counter for next time
        uint256 jobId = nextJobId++;

        // 2. Create the "Job Ticket" in our database
        jobs[jobId] = Job(
            jobId,
            msg.sender,  // The "manager" is whoever called this function
            _specialist,
            _amount,
            true,        // Mark as funded
            false        // Mark as NOT complete
        );

        // 3. THIS IS THE MOST IMPORTANT PART: The Payment
        // This line tells the USDC contract:
        // "Please TRANSFERFROM the Manager's wallet (msg.sender),
        // TO this contract's vault (address(this)),
        // the specified _amount."
        //
        // This will ONLY work if the Manager Agent *first*
        // "approved" our contract to spend its USDC.
        bool success = usdcToken.transferFrom(msg.sender, address(this), _amount);
        require(success, "USDC transfer failed. Did you approve?");

        // 4. Log that this happened.
        emit JobFunded(jobId, msg.sender, _specialist, _amount);

        // 5. Return the new ID to the caller.
        return jobId;
    }

    /**
     * @dev The Manager Agent calls this to release the payment
     * to the Specialist Agent once the job is done.
     */
    function releasePayment(uint256 _jobId) public {
        
        // --- The 3 Security Guards ---
        
        // We "load" the job data from our database into memory
        Job storage job = jobs[_jobId];

        // Guard 1: "Are you the Manager for this job?"
        // We check if the person calling this function (msg.sender)
        // is the *same person* who created the job.
        require(job.manager == msg.sender, "Only the manager can release payment");

        // Guard 2: "Is this job actually funded?"
        require(job.isFunded, "Job is not funded");

        // Guard 3: "Has this job *already* been paid?"
        // This prevents the Manager from accidentally paying twice.
        require(!job.isComplete, "Job is already complete");

        // --- The Action ---

        // 1. Mark the "Job Ticket" as complete
        job.isComplete = true;

        // 2. Pay the specialist!
        // This tells the USDC contract:
        // "Please TRANSFER the money from *this contract's vault*
        // TO the Specialist's wallet."
        usdcToken.transfer(job.specialist, job.amount);

        // 3. Log that the payment was sent.
        emit PaymentReleased(_jobId);
    }
}