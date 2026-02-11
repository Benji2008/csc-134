/*
M3T2
Compare two triangles
*/

#include <iostream>
using namespace std;

int main(){
    /// program to measure two rectangles   
    double length1, width1, area1;
    double length2, width2, area2;
    
    // get info
    cout << "Please enter the measurements for two rectangles." << endl << endl;
    cout << "Rectangle 1:" << endl;
    cout << "length? "; 
    cin >> length1;
    cout << "Width? ";
    cin >> width1;
    cout << endl;
        cout << "Rectangle 2;" << endl;
    cout << "length? ";
    cin >> length2;
    cout << "width? ";
    cin >> width2 ;

    // calculate areas
    area1 = length1 * width1;
    area2 = length1 * width2;
    
    // print 
    cout << "Rectangle 1 is area: " << area1 << endl;
    cout << "Rectangle 2 is area: " << area2 << endl;

// finally compare the two
if (area1 > area2){
    cout << "The first rectangle is largest." << endl;
}
if (area1 < area2){
    cout << "The second rectangle is largest." << endl;
}
if (area1 == area2){
    cout << "Both are the same size." << endl; 
}
return 0;
}