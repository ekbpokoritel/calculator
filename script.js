const currentDisplay = document.querySelector(".current-value");
const previousDisplay = document.querySelector(".previous-value");
const buttons = document.querySelectorAll("button");

let currentValue = "0";
let previousValue = "";
let operator = null;
let waitingForNumber = false;

function updateDisplay() {
    currentDisplay.textContent = currentValue;
    previousDisplay.textContent =
        previousValue && operator
            ? `${previousValue} ${operator}`
            : "";
}

function inputNumber(number) {
    if (waitingForNumber) {
        currentValue = number;
        waitingForNumber = false;
        return;
    }

    if (currentValue === "0") {
        currentValue = number;
    } else if (currentValue.length < 12) {
        currentValue += number;
    }
}

function inputDecimal() {
    if (waitingForNumber) {
        currentValue = "0,";
        waitingForNumber = false;
        return;
    }

    if (!currentValue.includes(",")) {
        currentValue += ",";
    }
}

function chooseOperator(nextOperator) {
    if (operator && !waitingForNumber) {
        calculate();
    }

    previousValue = currentValue;
    operator = nextOperator;
    waitingForNumber = true;
}

function calculate() {
    if (!operator || previousValue === "" || waitingForNumber) {
        return;
    }

    const first = parseFloat(previousValue.replace(",", "."));
    const second = parseFloat(currentValue.replace(",", "."));

    let result;

    switch (operator) {
        case "+":
            result = first + second;
            break;

        case "−":
            result = first - second;
            break;

        case "×":
            result = first * second;
            break;

        case "÷":
            if (second === 0) {
                currentValue = "Ошибка";
                previousValue = "";
                operator = null;
                waitingForNumber = true;
                updateDisplay();
                return;
            }

            result = first / second;
            break;
    }

    result = Math.round((result + Number.EPSILON) * 100000000) / 100000000;

    currentValue = String(result).replace(".", ",");
    previousValue = "";
    operator = null;
    waitingForNumber = true;
}

function clearCalculator() {
    currentValue = "0";
    previousValue = "";
    operator = null;
    waitingForNumber = false;
}

function toggleSign() {
    if (currentValue === "0" || currentValue === "Ошибка") {
        return;
    }

    currentValue = currentValue.startsWith("-")
        ? currentValue.slice(1)
        : "-" + currentValue;
}

function percentage() {
    if (currentValue === "Ошибка") {
        return;
    }

    const number = parseFloat(currentValue.replace(",", "."));

    currentValue = String(number / 100).replace(".", ",");
}

buttons.forEach((button) => {
    button.addEventListener("click", () => {
        const value = button.textContent.trim();

        if (/^\d$/.test(value)) {
            inputNumber(value);
        } else if (value === ",") {
            inputDecimal();
        } else if (["+", "−", "×", "÷"].includes(value)) {
            chooseOperator(value);
        } else if (value === "=") {
            calculate();
        } else if (value === "AC") {
            clearCalculator();
        } else if (value === "±") {
            toggleSign();
        } else if (value === "%") {
            percentage();
        }

        updateDisplay();
    });
});

updateDisplay();
document.addEventListener("keydown", (event) => {
    const key = event.key;

    if (/^\d$/.test(key)) {
        inputNumber(key);
    } 
    
    else if (key === "." || key === ",") {
        inputDecimal();
    } 
    
    else if (key === "+") {
        chooseOperator("+");
    } 
    
    else if (key === "-") {
        chooseOperator("−");
    } 
    
    else if (key === "*") {
        chooseOperator("×");
    } 
    
    else if (key === "/") {
        event.preventDefault();
        chooseOperator("÷");
    } 
    
    else if (key === "Enter" || key === "=") {
        event.preventDefault();
        calculate();
    } 
    
    else if (key === "Escape") {
        clearCalculator();
    }

    else if (key === "Backspace") {
        if (
            currentValue !== "Ошибка" &&
            !waitingForNumber
        ) {
            if (currentValue.length > 1) {
                currentValue = currentValue.slice(0, -1);
            } else {
                currentValue = "0";
            }
        }
    }

    updateDisplay();
});