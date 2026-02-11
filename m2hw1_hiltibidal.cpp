/*
m2hw1
Connor
2/11/26
*/

#include <iostream>
#include <iomanip>
#include <string>
#include <algorithm>
using namespace std;

int main(){
    string name;
    string acct_number = "9875345";
    double balance, deposit, withdrawl, finale_balance; 
    string response;




// question one - banking program.

transform(response.begin(), response.end(), response.begin(),
  [](unsigned char c){ return std::tolower(c); });


    cout << "hello thank you for chosing Vbucks As your banker. " << endl; 
    cout << endl << "------" << endl; // separator
    cout << "What is the name on the bank account? ";
    cin >> name; 
    cout << "account number is " + acct_number << endl;
    cout << "what is your starting balance? ";
    cin >> balance;
    cout << "Your balance is: $" << balance << endl;
    cout << "would you like to withdrawl? ";
    cin >> response;
    if (response == "yes"){
        cout << "How much would you like to withdrawl? ";
        cin >> withdrawl; 
    }
    else if (response == "no"){
        cout << "have a great day " + name << endl << endl;
    }

    return 0;
}