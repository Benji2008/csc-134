//m4hw1
//hiltibidal
// 3/9/26

#include <iostream>
using namespace std;
int main() {
    int n;

    do {
        std::cout << "Enter a digit between 1 and 12: ";
        std::cin >> n;

        if (n < 1 || n > 12) {
            std::cout << "Invalid input. Please enter your digit 1-12 again." << std::endl;
            // input to prevent infinite loops
            if (std::cin.fail()) {
                std::cin.clear();
                std::cin.ignore(100, '\n'); 
            }
        }
    } while (n < 1 || n > 12); 

    std::cout << "\nMultiplication table for " << n << ":" << std::endl;
    for (int i = 1; i <= 12; ++i) {
        std::cout << n << " * " << i << " = " << n * i << std::endl;
    }

    return 0;
}

