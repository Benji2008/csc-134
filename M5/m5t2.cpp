// M5T2 - Functions Practice
// norrisa
// 3/23/26


#include <iostream>
#include "m5t2.h"
using namespace std;

int main()
{
    // print out a table of squares
    cout << "Num\tSquare" << endl;
    int start  = 1;
    int finish = 10;
    for (int num=start; num <= finish; num++) {
        int sq = square(num);
        print_table_line(num, sq);

    }
    //next write to a file
    string filename = "squares.txt";
    write_squares_table(filename, start, finish);
    read_squares_table(filename);

    return 0;
}
