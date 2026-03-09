//m4hw1
//hiltibidal
// 3/9/26

#include <iostream>
using namespace std;
int main() {
    int n;

    do {
        cout << "Enter a digit between 1 and 12: ";
        cin >> n;

        if (n < 1 || n > 12) {
            cout << "Invalid input. Please enter your digit 1-12 again." << endl;
            // input to prevent infinite loops
            if (cin.fail()) {
                cin.clear();
                cin.ignore(100, '\n'); 
            }
        }
    } while (n < 1 || n > 12); 

    cout << "\nMultiplication table for " << n << ":" << endl;
    for (int i = 1; i <= 12; ++i) {
        cout << n << " * " << i << " = " << n * i << endl;
    }

    return 0;
}

