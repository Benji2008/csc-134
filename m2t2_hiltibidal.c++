/*
CSC 134 
hiltibidal
1/28/26

*/
#include <iostream>
#include <iomanip>

using namespace std;
int main() {

    //variables
    string meal_name = "Krabby patty";
    double meal_price = 6.99;
    int     meal_count;
    //receipt
    double subtotal, tip, tax_amount, total; //all $
    const double TAX_RATE = 0.07; // 7%
    //take order 
    cout << "welcome to the restaurant" << endl;
    cout << "how many " << meal_name << " would you like?" << endl;
    cin >> meal_count;
    cout << "Preparing your order..." << endl; 

    // calculate the subtotal and totalp
    subtotal = meal_price * meal_count;

    //print the receipt
    cout << "-----------------------" << endl;
    cout << meal_name << " x " << meal_count    << endl;
    cout << "SUBTOTAL:\t\t$" << subtotal    << endl;
    cout << "tax\t\t\t$" << tax_amount << endl;
    cout << "-----------------" << endl;
    cout << "THANK YOU VOME AGAIN!" << endl << endl;
    return 0;

}