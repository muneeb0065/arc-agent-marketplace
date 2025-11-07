// SPDX-License-Identifier: MIT
// This line is a standard "license" that all contracts should have.
pragma solidity ^0.8.20;

/**
 * @title AgentServiceRegistry
 * @dev This is our on-chain "Yellow Pages" for AI agents.
 * It stores a list of available services, their API endpoints, and their cost.
 */
contract AgentServiceRegistry {
    
    // This is a "struct", which is like a custom data type.
    // It's the "blueprint" for what a "Service" looks like.
    struct Service {
        string name;        // The service's name, like "TweetWriter"
        string endpoint;    // The API URL we need to call to use it
        uint256 cost;       // The price in USDC (with 6 decimal places)
        address payable owner; // The wallet address that gets paid
    }

    // This is a "mapping". It's like a giant public dictionary.
    // It connects a "key" (the service name string) to a "value" (the Service struct).
    mapping(string => Service) public services;

    /**
     * @dev Registers a new AI agent service.
     * We will call this function ourselves *after* we build our AI agent.
     */
    function registerService(
        string memory _name,
        string memory _endpoint,
        uint256 _cost
    ) public {
        // This is a "require" statement. It's a security check.
        // It makes sure a service with this name doesn't already exist.
        // `bytes().length` is just a simple way to check if the name is empty.
        require(
            bytes(services[_name].name).length == 0,
            "Service name already exists"
        );

        // This is the action:
        // 1. We create a new "Service" in memory
        // 2. We add it to our public "services" mapping
        // 3. `msg.sender` is a built-in variable that means
        //    "the wallet address that called this function."
        services[_name] = Service(
            _name,
            _endpoint,
            _cost,
            payable(msg.sender)
        );
    }

    /**
     * @dev Fetches a service's details by its name.
     * Our Node.js "Manager Agent" will call this function to find agents.
     * The "view" keyword means this function is "read-only" and costs no gas.
     */
    function getService(string memory _name)
        public
        view
        returns (Service memory)
    {
        return services[_name];
    }
}