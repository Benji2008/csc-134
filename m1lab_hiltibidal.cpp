//csc 134
// M1 lab - sales
//Connor Hiltibidal 
//1/14/26
/*

were selling food - you decide what you wanna sell
tell me how much you have
how much each costs
and what your total would be.

if we have time we'll make it more interactive
*/
#include <iostream>
using namespace std;

int main() {
    string item = "VBucks";
    int item_count = 100;
    int purchased;
double price_each = 5.00;
double total_price;

cout << "welcome to our " << item << " store. " << endl;
cout << "we have" << item_count << " " << item << "," << endl;
cout << "they cost $" << price_each << " each. " << endl; 

cout << "how many would you like to purchase?" ;
cin >> purchased;

total_price = purchased * price_each;

cout << "Total price is $" << total_price << endl;


return 0; 
}