/// m4 lab - loop in loop
// hiltibidal
// 3/9/26

#include <iostream>
using namespace std;

int main(){
    char symbol = '@';
    string emoji = "👾";
    int height = 9;
    int width = 9;

    cout << "Enter the height and width ( seperate with a space); ";
    cin >> height >> width;
   
    // create a box of emoji symbols
    for (int i=0; i<width; i++) {
        cout << emoji;
    }
    cout << endl; // end line

    for (int i=0; i<height; i ++ ) {
        cout << emoji << endl;
    }
    cout << endl << endl;

    for (int i=0; i<height; i++) {
        for (int j=0; j<width; j++){
            cout << emoji;
        }
        cout << endl;
    }

}
