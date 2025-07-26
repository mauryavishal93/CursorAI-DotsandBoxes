// Error Detection Script for Dots and Boxes
console.log('🔍 Starting Error Detection...');

// Global error handler
window.addEventListener('error', function(event) {
    console.error('❌ JavaScript Error Detected:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Unhandled Promise Rejection:', {
        reason: event.reason,
        promise: event.promise
    });
});

// Check for common issues
function checkForCommonIssues() {
    console.log('🔍 Checking for common issues...');
    
    // Check if required elements exist
    const requiredElements = [
        'home-screen',
        'single-player-setup-screen', 
        'two-player-setup-screen',
        'single-player-game-screen',
        'two-player-game-screen',
        'online-game-screen',
        'online-lobby-ui'
    ];
    
    requiredElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`❌ Missing required element: ${elementId}`);
        } else {
            console.log(`✅ Found element: ${elementId}`);
        }
    });
    
    // Check if required functions exist
    const requiredFunctions = [
        'startGame',
        'showMessage', 
        'showConfirmation',
        'showScreen'
    ];
    
    requiredFunctions.forEach(funcName => {
        if (typeof window[funcName] !== 'function') {
            console.error(`❌ Missing required function: ${funcName}`);
        } else {
            console.log(`✅ Found function: ${funcName}`);
        }
    });
    
    // Check Socket.IO connection
    if (typeof io !== 'undefined') {
        console.log('✅ Socket.IO library loaded');
    } else {
        console.error('❌ Socket.IO library not loaded');
    }
    
    // Check for canvas elements
    const canvases = [
        'sp-gameCanvas',
        'tp-gameCanvas', 
        'online-gameCanvas'
    ];
    
    canvases.forEach(canvasId => {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            try {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    console.log(`✅ Canvas ${canvasId} is working`);
                } else {
                    console.error(`❌ Canvas ${canvasId} context not available`);
                }
            } catch (error) {
                console.error(`❌ Canvas ${canvasId} error:`, error);
            }
        } else {
            console.error(`❌ Missing canvas: ${canvasId}`);
        }
    });
}

// Check for CSS issues
function checkCSSIssues() {
    console.log('🔍 Checking CSS...');
    
    const style = getComputedStyle(document.body);
    if (style.fontFamily) {
        console.log('✅ CSS is loading');
    } else {
        console.error('❌ CSS may not be loading properly');
    }
}

// Check for network issues
function checkNetworkIssues() {
    console.log('🔍 Checking network connectivity...');
    
    // Check if we can reach the server
    fetch('/')
        .then(response => {
            if (response.ok) {
                console.log('✅ Server is reachable');
            } else {
                console.error('❌ Server returned error status:', response.status);
            }
        })
        .catch(error => {
            console.error('❌ Network error:', error);
        });
}

// Run all checks
function runAllChecks() {
    console.log('🚀 Starting comprehensive error detection...');
    
    setTimeout(() => {
        checkForCommonIssues();
    }, 100);
    
    setTimeout(() => {
        checkCSSIssues();
    }, 200);
    
    setTimeout(() => {
        checkNetworkIssues();
    }, 300);
    
    setTimeout(() => {
        console.log('✅ Error detection complete');
    }, 1000);
}

// Auto-run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAllChecks);
} else {
    runAllChecks();
}

// Export for manual testing
window.errorDetection = {
    runAllChecks,
    checkForCommonIssues,
    checkCSSIssues,
    checkNetworkIssues
};

console.log('🔍 Error detection script loaded'); 