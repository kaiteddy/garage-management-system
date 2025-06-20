/**
 * Test JavaScript file with intentional code quality issues for DeepSource analysis
 * This file contains various issues that DeepSource should detect and potentially autofix
 */

// Unused variables
var unusedVariable = 'this is not used';
let anotherUnusedVar = 42;
const UNUSED_CONSTANT = 'constant';

// Global variables (not recommended)
var globalCounter = 0;
var globalData = {};

/**
 * Customer management class with various issues
 */
class CustomerManager {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.customers = [];
    }
    
    // Method with too many parameters (code smell)
    createCustomer(name, email, phone, address, city, postcode, country, company, notes, preferences) {
        // Hardcoded API key (security issue)
        const apiKey = 'sk-1234567890abcdef';
        
        // Using var instead of let/const
        var customerData = {
            name: name,
            email: email,
            phone: phone,
            address: address,
            city: city,
            postcode: postcode,
            country: country,
            company: company,
            notes: notes,
            preferences: preferences,
            apiKey: apiKey
        };
        
        return customerData;
    }
    
    // Function with callback hell
    loadCustomers(callback) {
        fetch(this.apiUrl + '/customers')
            .then(response => {
                response.json().then(data => {
                    this.processCustomers(data, (processedData) => {
                        this.validateCustomers(processedData, (validatedData) => {
                            this.sortCustomers(validatedData, (sortedData) => {
                                callback(sortedData);
                            });
                        });
                    });
                });
            })
            .catch(error => {
                console.log(error); // Should use console.error
            });
    }
    
    // Inefficient array operations
    filterCustomers(customers, criteria) {
        var result = [];
        for (var i = 0; i < customers.length; i++) {
            if (customers[i].name.indexOf(criteria) !== -1) {
                result.push(customers[i]);
            }
        }
        return result;
    }
    
    // Function with magic numbers
    calculateDiscount(amount) {
        if (amount > 1000) {
            return amount * 0.15; // Magic number
        } else if (amount > 500) {
            return amount * 0.10; // Magic number
        } else if (amount > 100) {
            return amount * 0.05; // Magic number
        }
        return 0;
    }
    
    // Duplicate code
    formatCustomerName1(customer) {
        if (customer.name) {
            return customer.name.trim().toLowerCase();
        }
        return '';
    }
    
    formatCustomerName2(customer) {
        if (customer.name) {
            return customer.name.trim().toLowerCase();
        }
        return '';
    }
}

// Function with poor error handling
function parseJsonData(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        // Empty catch block
    }
}

// Function with == instead of ===
function compareValues(a, b) {
    if (a == b) { // Should use ===
        return true;
    }
    if (a == null) { // Should use ===
        return false;
    }
    return false;
}

// Function with inefficient DOM manipulation
function updateCustomerList(customers) {
    var container = document.getElementById('customer-list');
    container.innerHTML = ''; // Inefficient DOM clearing
    
    for (var i = 0; i < customers.length; i++) {
        var div = document.createElement('div');
        div.innerHTML = '<span>' + customers[i].name + '</span>'; // XSS vulnerability
        container.appendChild(div);
    }
}

// Function with nested callbacks (callback hell)
function processCustomerData(customerId, callback) {
    getCustomer(customerId, function(customer) {
        getCustomerOrders(customer.id, function(orders) {
            getOrderDetails(orders[0].id, function(details) {
                calculateTotal(details, function(total) {
                    callback(total);
                });
            });
        });
    });
}

// Function with unreachable code
function validateEmail(email) {
    if (!email) {
        return false;
    }
    
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
    
    // Unreachable code
    console.log('This will never execute');
    return true;
}

// Function with too many nested conditions
function getCustomerStatus(customer) {
    if (customer) {
        if (customer.isActive) {
            if (customer.orders) {
                if (customer.orders.length > 0) {
                    if (customer.orders[0].status === 'completed') {
                        if (customer.orders[0].amount > 100) {
                            return 'premium';
                        } else {
                            return 'regular';
                        }
                    } else {
                        return 'pending';
                    }
                } else {
                    return 'new';
                }
            } else {
                return 'no-orders';
            }
        } else {
            return 'inactive';
        }
    } else {
        return 'unknown';
    }
}

// Global function modifying global variables
function incrementCounter() {
    globalCounter++; // Modifying global variable
    globalData.lastIncrement = new Date();
}

// Function with console.log statements (should be removed in production)
function debugCustomer(customer) {
    console.log('Customer data:', customer);
    console.log('Processing customer:', customer.name);
    console.log('Customer email:', customer.email);
    
    return customer;
}

// Event listener with inline function (could be extracted)
document.addEventListener('DOMContentLoaded', function() {
    var button = document.getElementById('load-customers');
    if (button) {
        button.addEventListener('click', function() {
            var manager = new CustomerManager('/api');
            manager.loadCustomers(function(customers) {
                updateCustomerList(customers);
            });
        });
    }
});

// Potential issues that DeepSource should catch:
// 1. Unused variables
// 2. Hardcoded credentials/API keys
// 3. Use of var instead of let/const
// 4. Callback hell
// 5. Inefficient array operations
// 6. Magic numbers
// 7. Code duplication
// 8. Empty catch blocks
// 9. == instead of ===
// 10. XSS vulnerabilities
// 11. Unreachable code
// 12. Too many nested conditions
// 13. Global variable modifications
// 14. Console.log statements
// 15. Inline event handlers
