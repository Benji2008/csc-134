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
    //declare variables at the top easier to read
    string item = "VBucks";
    int item_count = 100;
double price_each = 0.80;
double total_price;

cout << "welcome to our " << item << " store. " << endl;
cout << "we have" << item_count << " " << item << "," << endl;
cout << "they cost $" << price_each << " each. " << endl; 

total_price = item_count * price_each;

cout << "Total price is $" << total_price << endl;

return 0; 
}